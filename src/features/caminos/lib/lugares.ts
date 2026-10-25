// Rutas propias de Caminos: buscar pueblos, proponer paradas entre la salida y la llegada y calcular los km de cada
// tramo. Sin servicios de rutas: los km son la distancia en línea recta con un margen por las curvas del camino.
// Funciones puras sobre el paquete `public/lugares/espana.json` (scripts/lugares/README.md).
import { normalizeName } from '../../../shared/lib/text'
import { distanciaM } from '../../actividades/lib/geo'

export interface Lugar {
  nombre: string
  provincia: string
  lat: number
  lon: number
  poblacion: number
  /** Nombre normalizado, para buscar sin acentos ni mayúsculas. */
  norma: string
}

/**
 * Margen sobre la línea recta: los caminos y carreteras entre pueblos de España suelen ser un 10–30 % más largos
 * (Tarragona–Valencia: 228 km en línea recta y unos 260 por carretera). Es una aproximación de AppFit; cada tramo se
 * puede corregir a mano.
 */
export const FACTOR_CAMINO = 1.15

export class PaqueteLugaresInvalido extends Error {}

/** Valida el paquete descargado y lo convierte en lugares (en su orden: de más a menos habitantes). */
export function leerPaqueteLugares(raw: unknown): Lugar[] {
  const p = raw as { formato?: unknown; provincias?: unknown; lugares?: unknown }
  if (!p || p.formato !== 1 || !Array.isArray(p.provincias) || !Array.isArray(p.lugares)) throw new PaqueteLugaresInvalido('Formato desconocido')
  const provincias = p.provincias as string[]
  return (p.lugares as unknown[]).flatMap((f) => {
    if (!Array.isArray(f) || typeof f[0] !== 'string' || typeof f[2] !== 'number' || typeof f[3] !== 'number') return []
    return [{ nombre: f[0], provincia: provincias[f[1] as number] ?? '', lat: f[2], lon: f[3], poblacion: Number(f[4]) || 0, norma: normalizeName(f[0]) }]
  })
}

/**
 * Lugares cuyo nombre empieza por lo escrito (o tiene una palabra que empieza así), los que empiezan primero y, a
 * igualdad, los más poblados. Hasta `n`.
 */
export function buscarLugares(lugares: readonly Lugar[], texto: string, n = 6): Lugar[] {
  const q = normalizeName(texto)
  if (!q) return []
  const empiezan: Lugar[] = []
  const contienen: Lugar[] = []
  for (const l of lugares) {
    if (l.norma.startsWith(q)) empiezan.push(l)
    else if (l.norma.includes(` ${q}`) || l.norma.includes(`-${q}`) || l.norma.includes(`'${q}`)) contienen.push(l)
    if (empiezan.length >= n) break
  }
  return [...empiezan, ...contienen].slice(0, n)
}

const punto = (l: Pick<Lugar, 'lat' | 'lon'>): [number, number] => [l.lat, l.lon]

/** Km aproximados de un tramo: línea recta × `FACTOR_CAMINO`, con un decimal. */
export function kmTramo(a: Pick<Lugar, 'lat' | 'lon'>, b: Pick<Lugar, 'lat' | 'lon'>): number {
  return Math.max(0.1, Math.round((distanciaM(punto(a), punto(b)) / 1000) * FACTOR_CAMINO * 10) / 10)
}

/** Posición de un punto a lo largo de la recta salida→llegada (0 en la salida, 1 en la llegada), en grados planos. */
export function posicionEnRecta(salida: Pick<Lugar, 'lat' | 'lon'>, llegada: Pick<Lugar, 'lat' | 'lon'>, p: Pick<Lugar, 'lat' | 'lon'>): number {
  const coslat = Math.cos(((salida.lat + llegada.lat) / 2) * (Math.PI / 180))
  const dx = (llegada.lon - salida.lon) * coslat
  const dy = llegada.lat - salida.lat
  const largo2 = dx * dx + dy * dy
  return largo2 === 0 ? 0 : (((p.lon - salida.lon) * coslat) * dx + (p.lat - salida.lat) * dy) / largo2
}

/**
 * Paradas propuestas entre la salida y la llegada: una cada `cadaKm` (de camino) más o menos. Para cada punto que toca
 * en la recta se elige, a menos de la mitad de esa distancia, el pueblo que mejor combina cercanía y tamaño (los más
 * poblados atraen: suelen ser por donde pasa el camino, y la recta a veces cae en el mar); si no hay ninguno, el más
 * cercano a menos de tres cuartos. En orden de la salida a la llegada, sin repetir ni incluir los extremos.
 */
export function proponerParadas(salida: Lugar, llegada: Lugar, lugares: readonly Lugar[], cadaKm: number): Lugar[] {
  const kmTotal = (distanciaM(punto(salida), punto(llegada)) / 1000) * FACTOR_CAMINO
  const tramos = Math.max(1, Math.round(kmTotal / cadaKm))
  const radio = (cadaKm / FACTOR_CAMINO) * 1000 / 2
  const elegidos = new Set<Lugar>([salida, llegada])
  const paradas: Lugar[] = []
  for (let k = 1; k < tramos; k++) {
    const f = k / tramos
    const objetivo: [number, number] = [salida.lat + (llegada.lat - salida.lat) * f, salida.lon + (llegada.lon - salida.lon) * f]
    let mejor: Lugar | null = null
    let puntuacion = -Infinity
    let cercano: Lugar | null = null
    let dCercano = Infinity
    for (const l of lugares) {
      if (elegidos.has(l) || Math.abs(l.lat - objetivo[0]) > 1 || Math.abs(l.lon - objetivo[1]) > 1.4) continue
      const d = distanciaM(punto(l), objetivo)
      const p = Math.log10(Math.max(l.poblacion, 1)) - 2 * (d / radio)
      if (d <= radio && p > puntuacion) { puntuacion = p; mejor = l }
      if (d < dCercano) { dCercano = d; cercano = l }
    }
    const elegido = mejor ?? (cercano && dCercano <= radio * 1.5 ? cercano : null)
    if (elegido) { elegidos.add(elegido); paradas.push(elegido) }
  }
  return paradas.sort((a, b) => posicionEnRecta(salida, llegada, a) - posicionEnRecta(salida, llegada, b))
}

/** Índice en el que insertar una parada nueva entre las que ya hay, según su posición en la recta. */
export function indiceParaInsertar(salida: Pick<Lugar, 'lat' | 'lon'>, llegada: Pick<Lugar, 'lat' | 'lon'>, paradas: readonly Pick<Lugar, 'lat' | 'lon'>[], nueva: Pick<Lugar, 'lat' | 'lon'>): number {
  const pos = posicionEnRecta(salida, llegada, nueva)
  const i = paradas.findIndex((p) => posicionEnRecta(salida, llegada, p) > pos)
  return i === -1 ? paradas.length : i
}
