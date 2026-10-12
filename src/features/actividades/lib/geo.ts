// Geometría del recorrido: distancias, desnivel, simplificación y proyección para dibujarlo. Todo en el dispositivo y
// sin mapas: el recorrido se dibuja como una línea, sin calles ni teselas de ningún servicio.
import type { PuntoRecorrido } from '../../../shared/db/types'

/** Radio medio de la Tierra (m), el de la fórmula del semiverseno. */
const RADIO_TIERRA = 6_371_008.8
const RAD = Math.PI / 180

/** Distancia en metros entre dos puntos (semiverseno; de sobra para tramos de un recorrido a pie). */
export function distanciaM(a: PuntoRecorrido, b: PuntoRecorrido): number {
  const dLat = (b[0] - a[0]) * RAD
  const dLon = (b[1] - a[1]) * RAD
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * RAD) * Math.cos(b[0] * RAD) * Math.sin(dLon / 2) ** 2
  return 2 * RADIO_TIERRA * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Metros de un recorrido: la suma dentro de cada tramo (entre tramos, una pausa o un corte, no se cuenta nada). */
export function distanciaRecorrido(tramos: readonly (readonly PuntoRecorrido[])[]): number {
  let total = 0
  for (const t of tramos) for (let i = 1; i < t.length; i++) total += distanciaM(t[i - 1], t[i])
  return total
}

/**
 * Desnivel positivo (m) con histéresis: solo suma una subida cuando supera `umbral` metros desde el último punto de
 * referencia, para que el ruido de la altitud (sobre todo la del GPS) no se acumule. `undefined` sin altitudes.
 */
export function desnivelPositivo(tramos: readonly (readonly PuntoRecorrido[])[], umbral = 5): number | undefined {
  let total = 0
  let conAltitud = false
  for (const t of tramos) {
    let ref: number | undefined
    for (const p of t) {
      const ele = p[2]
      if (ele === undefined || !Number.isFinite(ele)) continue
      conAltitud = true
      if (ref === undefined) { ref = ele; continue }
      if (ele - ref >= umbral) { total += ele - ref; ref = ele }
      else if (ref - ele >= umbral) ref = ele
    }
  }
  return conAltitud ? Math.round(total) : undefined
}

/** Proyección local en metros (equirrectangular alrededor de `lat0`): basta para un recorrido de unos kilómetros. */
function aMetros(p: PuntoRecorrido, lat0: number): [number, number] {
  return [p[1] * RAD * RADIO_TIERRA * Math.cos(lat0 * RAD), p[0] * RAD * RADIO_TIERRA]
}

function distanciaASegmento(p: [number, number], a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const largo2 = dx * dx + dy * dy
  const t = largo2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / largo2))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

/** Ramer-Douglas-Peucker iterativo: conserva los puntos que se separan más de `toleranciaM` de la línea simplificada. */
function rdp(puntos: readonly PuntoRecorrido[], toleranciaM: number): PuntoRecorrido[] {
  if (puntos.length <= 2) return [...puntos]
  const lat0 = puntos[0][0]
  const m = puntos.map((p) => aMetros(p, lat0))
  const conservar = new Uint8Array(puntos.length)
  conservar[0] = 1
  conservar[puntos.length - 1] = 1
  const pila: [number, number][] = [[0, puntos.length - 1]]
  while (pila.length) {
    const [ini, fin] = pila.pop()!
    let max = 0
    let indice = -1
    for (let i = ini + 1; i < fin; i++) {
      const d = distanciaASegmento(m[i], m[ini], m[fin])
      if (d > max) { max = d; indice = i }
    }
    if (indice !== -1 && max > toleranciaM) {
      conservar[indice] = 1
      pila.push([ini, indice], [indice, fin])
    }
  }
  return puntos.filter((_, i) => conservar[i] === 1)
}

/** Puntos que se guardan como mucho de un recorrido: unos 15 KB en el backup. */
export const MAX_PUNTOS = 800

/** Redondea a 5 decimales (~1 m) y la altitud a metros enteros. */
export function redondearPunto(p: PuntoRecorrido): PuntoRecorrido {
  const lat = Math.round(p[0] * 1e5) / 1e5
  const lon = Math.round(p[1] * 1e5) / 1e5
  return p[2] === undefined || !Number.isFinite(p[2]) ? [lat, lon] : [lat, lon, Math.round(p[2])]
}

/**
 * Recorrido para guardar: simplificado (desde 2 m de tolerancia, que se dobla hasta caber en `MAX_PUNTOS`) y
 * redondeado. Los tramos de menos de dos puntos se descartan. La distancia y el desnivel se calculan antes, con todos
 * los puntos.
 */
export function simplificarRecorrido(tramos: readonly (readonly PuntoRecorrido[])[], max = MAX_PUNTOS): PuntoRecorrido[][] {
  const validos = tramos.filter((t) => t.length >= 2)
  let tolerancia = 2
  let resultado = validos.map((t) => rdp(t, tolerancia))
  while (resultado.reduce((a, t) => a + t.length, 0) > max && tolerancia < 100_000) {
    tolerancia *= 2
    resultado = validos.map((t) => rdp(t, tolerancia))
  }
  return resultado.map((t) => t.map(redondearPunto))
}

export interface Trazado {
  /** Un `d` de `<path>` por tramo. */
  tramos: string[]
  /** Los puntos proyectados de cada tramo. */
  puntos: [number, number][][]
  /** Los `extras` proyectados con la misma escala (p. ej. una marca de posición). */
  extras: [number, number][]
  inicio: [number, number] | null
  fin: [number, number] | null
  ancho: number
  alto: number
}

const r1 = (n: number) => Math.round(n * 10) / 10

/**
 * Proyecta el recorrido en una caja de `ancho` × `alto` con `margen`, manteniendo la proporción (el norte arriba) y
 * centrado. Coordenadas con un decimal. `extras` se proyectan igual sin contar para la escala. `null` sin al menos dos
 * puntos.
 */
export function proyectarRecorrido(tramos: readonly (readonly PuntoRecorrido[])[], ancho: number, alto: number, margen = 8, extras: readonly PuntoRecorrido[] = []): Trazado | null {
  const todos = tramos.flat()
  if (todos.length < 2) return null
  const lat0 = todos.reduce((a, p) => a + p[0], 0) / todos.length
  const enMetros = tramos.map((t) => t.map((p) => aMetros(p, lat0)))
  const xs = enMetros.flat().map((p) => p[0])
  const ys = enMetros.flat().map((p) => p[1])
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const escala = Math.min((ancho - 2 * margen) / Math.max(maxX - minX, 1), (alto - 2 * margen) / Math.max(maxY - minY, 1))
  const offX = (ancho - (maxX - minX) * escala) / 2
  const offY = (alto - (maxY - minY) * escala) / 2
  const proyectar = (p: [number, number]): [number, number] => [r1(offX + (p[0] - minX) * escala), r1(offY + (maxY - p[1]) * escala)]
  const proyectados = enMetros.map((t) => t.map(proyectar))
  const conPuntos = proyectados.filter((t) => t.length > 0)
  return {
    tramos: conPuntos.map((t) => t.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`).join(' ')),
    puntos: conPuntos,
    extras: extras.map((p) => proyectar(aMetros(p, lat0))),
    inicio: conPuntos[0]?.[0] ?? null,
    fin: conPuntos.at(-1)?.at(-1) ?? null,
    ancho,
    alto,
  }
}

/** Perfil de altitud: distancia acumulada (m) y altitud de cada punto con altitud. Vacío si no hay altitudes. */
export function perfilAltitud(tramos: readonly (readonly PuntoRecorrido[])[]): { distanciaM: number; ele: number }[] {
  const perfil: { distanciaM: number; ele: number }[] = []
  let acumulada = 0
  for (const t of tramos) {
    t.forEach((p, i) => {
      if (i > 0) acumulada += distanciaM(t[i - 1], p)
      if (p[2] !== undefined && Number.isFinite(p[2])) perfil.push({ distanciaM: acumulada, ele: p[2] })
    })
  }
  return perfil
}
