// Caminos: se recorre una ruta real o de ficción tras otra con los kilómetros de las actividades (caminar, correr y
// senderismo), desde el día en que se elige la primera. Derivado como Cumbres: nada se acumula ni se guarda salvo las
// rutas elegidas (`Settings.caminos`), así que respeta la edición retroactiva. Sin plazo y sin poder fallar. Al llegar,
// los metros que sobran no pasan a la siguiente (como en Cumbres). Las rutas se pueden repetir: no se acaban.
import type { Actividad, ConfigCaminos } from '../../../shared/db/types'
import { addDays, diasEntre } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import { formatKm, kmTexto } from '../../actividades/lib/actividad'
import { metrosRuta, RUTAS, rutaDe as rutaOficial, type Ruta } from './rutas'

/** Rutas que se enseñan después de la actual. */
export const SIGUIENTES = 5

/** Cuándo pasó algo y con qué actividad. */
export interface Marca {
  fecha: string
  actividadId: number
}

/** Un capítulo: una ruta, de la salida a la llegada. */
export interface Expedicion {
  ruta: Ruta
  /** Qué vez se recorre esta ruta (1 la primera). */
  vez: number
  /** Día en que empezó: el inicio de Caminos o el de la llegada anterior. */
  desde: string
  /** Metros recorridos (nunca más que la ruta). */
  metros: number
  /** Cuándo se llegó al final de cada etapa, por índice (las que faltan, sin marca). */
  etapas: (Marca | null)[]
  llegada: Marca | null
  /** Sellos de la credencial: días con alguna actividad que avanzó en esta ruta, en orden. */
  sellos: string[]
}

/** Metros que avanzó cada actividad (los que sobran al llegar se descartan). */
export interface TramoRecorrido extends Marca {
  metros: number
  /** Índice de la expedición en `expediciones`. */
  expedicion: number
}

export interface ResultadoCaminos {
  inicio: string
  /** Las terminadas y, al final, la actual. */
  expediciones: Expedicion[]
  actual: Expedicion
  completadas: Expedicion[]
  siguientes: Ruta[]
  metrosTotales: number
  /** En orden cronológico. */
  tramos: TramoRecorrido[]
}

/**
 * Las primeras `n` rutas: las elegidas (ids válidos, en orden y con repeticiones; también las propias de `propias`) y
 * después la sugerida, que elige siempre la ruta de `RUTAS` hecha menos veces (a igualdad, la primera). Las propias
 * solo entran si se eligen.
 */
export function rutaDe(elegidas: readonly string[], n: number, propias: readonly Ruta[] = []): Ruta[] {
  const rutaPorId = (id: string) => rutaOficial(id) ?? propias.find((r) => r.id === id)
  const ruta: Ruta[] = []
  const veces = new Map<string, number>()
  const anadir = (r: Ruta) => { ruta.push(r); veces.set(r.id, (veces.get(r.id) ?? 0) + 1) }
  for (const id of elegidas) {
    const r = rutaPorId(id)
    if (r && ruta.length < n) anadir(r)
  }
  while (ruta.length < n) {
    let siguiente = RUTAS[0]
    for (const r of RUTAS) if ((veces.get(r.id) ?? 0) < (veces.get(siguiente.id) ?? 0)) siguiente = r
    anadir(siguiente)
  }
  return ruta
}

/** Metros desde la salida hasta el final de cada etapa. */
export function finalesDeEtapa(r: Ruta): number[] {
  let acumulado = 0
  return r.etapas.map((x) => (acumulado += Math.round(x.km * 1000)))
}

/**
 * Recorre las actividades terminadas desde el inicio, en orden: cada metro avanza la ruta actual. Al llegar al final
 * empieza la siguiente con las actividades posteriores. `null` si aún no se ha elegido la primera ruta.
 */
export function calcularCaminos(actividades: readonly Pick<Actividad, 'id' | 'fecha' | 'inicio' | 'distanciaM' | 'enCurso'>[], config: ConfigCaminos | undefined, hoy: string, propias: readonly Ruta[] = []): ResultadoCaminos | null {
  if (!config) return null
  const validas = actividades
    .filter((a) => !a.enCurso && a.fecha >= config.inicio && a.fecha <= hoy && a.distanciaM > 0)
    .sort((a, b) => a.inicio - b.inicio || a.id - b.id)
  // Cada actividad termina como mucho una ruta (lo que sobra se pierde): no puede haber más capítulos que actividades.
  const orden = rutaDe(config.ruta, validas.length + 1, propias)
  const veces = new Map<string, number>()
  const nueva = (i: number, desde: string): Expedicion => {
    const ruta = orden[i]
    const vez = (veces.get(ruta.id) ?? 0) + 1
    veces.set(ruta.id, vez)
    return { ruta, vez, desde, metros: 0, etapas: ruta.etapas.map(() => null), llegada: null, sellos: [] }
  }
  let i = 0
  let actual = nueva(0, config.inicio)
  let finales = finalesDeEtapa(actual.ruta)
  const expediciones = [actual]
  const tramos: TramoRecorrido[] = []
  let metrosTotales = 0

  for (const a of validas) {
    const marca: Marca = { fecha: a.fecha, actividadId: a.id }
    const total = finales[finales.length - 1]
    const metros = Math.min(Math.round(a.distanciaM), total - actual.metros)
    actual.metros += metros
    metrosTotales += metros
    tramos.push({ ...marca, metros, expedicion: i })
    if (actual.sellos[actual.sellos.length - 1] !== a.fecha) actual.sellos.push(a.fecha)
    finales.forEach((fin, j) => { if (actual.etapas[j] === null && actual.metros >= fin) actual.etapas[j] = marca })
    if (actual.metros >= total) {
      actual.llegada = marca
      i += 1
      actual = nueva(i, a.fecha)
      finales = finalesDeEtapa(actual.ruta)
      expediciones.push(actual)
    }
  }

  return {
    inicio: config.inicio,
    expediciones,
    actual,
    completadas: expediciones.filter((x) => x.llegada !== null),
    siguientes: rutaDe(config.ruta, i + 1 + SIGUIENTES, propias).slice(i + 1),
    metrosTotales,
    tramos,
  }
}

// ── Elegir ruta ──

/** Primera ruta: Caminos empieza hoy (no es retroactivo). */
export function empezar(hoy: string, rutaId: string): ConfigCaminos {
  return { inicio: hoy, ruta: [rutaId] }
}

/** Rutas por las que se puede cambiar la actual: cualquier otra (también las hechas y las propias) más larga que lo ya recorrido. */
export function rutasParaCambiar(r: ResultadoCaminos, propias: readonly Ruta[] = []): Ruta[] {
  return [...propias, ...RUTAS].filter((x) => x.id !== r.actual.ruta.id && metrosRuta(x) > r.actual.metros)
}

/** Cambia la ruta actual por otra (conserva lo recorrido). Las terminadas no cambian. `null` si no se puede. */
export function cambiarRuta(config: ConfigCaminos, r: ResultadoCaminos, rutaId: string, propias: readonly Ruta[] = []): ConfigCaminos | null {
  if (!rutasParaCambiar(r, propias).some((x) => x.id === rutaId)) return null
  return { ...config, ruta: [...r.completadas.map((c) => c.ruta.id), rutaId] }
}

/** Veces que se ha terminado cada ruta. */
export function vecesTerminada(r: ResultadoCaminos): Map<string, number> {
  const veces = new Map<string, number>()
  for (const x of r.completadas) veces.set(x.ruta.id, (veces.get(x.ruta.id) ?? 0) + 1)
  return veces
}

export const vecesTexto = (n: number) => (n === 1 ? '1 vez' : `${formatInt(n)} veces`)

/** «Camino Inglés» la primera vez y «Camino Inglés · 2.ª vez» al repetirlo. */
export function nombreExpedicion(x: Expedicion): string {
  return x.vez > 1 ? `${x.ruta.nombre} · ${formatInt(x.vez)}.ª vez` : x.ruta.nombre
}

// ── Lecturas para la interfaz ──

export interface PosicionEtapa {
  /** Índice de la etapa en curso (la última si ya se llegó). */
  indice: number
  /** Lugar de salida de la etapa en curso. */
  desde: string
  hasta: string
  /** Metros de la etapa ya recorridos y los que tiene. */
  recorridos: number
  total: number
}

/** En qué etapa se va y cuánto se lleva de ella. */
export function etapaActual(x: Expedicion): PosicionEtapa {
  const finales = finalesDeEtapa(x.ruta)
  let indice = finales.findIndex((fin) => x.metros < fin)
  if (indice === -1) indice = finales.length - 1
  const inicioEtapa = indice === 0 ? 0 : finales[indice - 1]
  return {
    indice,
    desde: indice === 0 ? x.ruta.desde : x.ruta.etapas[indice - 1].hasta,
    hasta: x.ruta.etapas[indice].hasta,
    recorridos: Math.min(x.metros, finales[indice]) - inicioEtapa,
    total: finales[indice] - inicioEtapa,
  }
}

/** Metros recorridos entre dos fechas, ambas incluidas. */
export function metrosEntre(tramos: readonly TramoRecorrido[], desde: string, hasta: string): number {
  return tramos.reduce((a, t) => (t.fecha >= desde && t.fecha <= hasta ? a + t.metros : a), 0)
}

/** Días que duró una ruta terminada, contando el primero y el de la llegada. */
export function diasDeExpedicion(x: Expedicion): number | null {
  return x.llegada ? diasEntre(x.desde, x.llegada.fecha) + 1 : null
}

export interface CaminoDeActividad {
  metros: number
  /** Etapas que terminó esta actividad, por expedición. */
  etapas: { expedicion: Expedicion; indice: number }[]
  llegadas: Expedicion[]
}

/** Lo que avanzó una actividad concreta: metros, etapas que terminó y llegadas. */
export function caminoDeActividad(r: ResultadoCaminos, actividadId: number): CaminoDeActividad {
  return {
    metros: r.tramos.reduce((a, t) => (t.actividadId === actividadId ? a + t.metros : a), 0),
    etapas: r.expediciones.flatMap((x) => x.etapas.flatMap((m, indice) => (m?.actividadId === actividadId ? [{ expedicion: x, indice }] : []))),
    llegadas: r.expediciones.filter((x) => x.llegada?.actividadId === actividadId),
  }
}

/** Días durante los que Inicio recuerda la última llegada (hoy, ayer y anteayer). */
export const DIAS_LLEGADA_RECIENTE = 3

export function llegadaReciente(r: ResultadoCaminos, hoy: string): Expedicion | null {
  const ultima = r.completadas[r.completadas.length - 1]
  return ultima?.llegada && ultima.llegada.fecha >= addDays(hoy, -(DIAS_LLEGADA_RECIENTE - 1)) && ultima.llegada.fecha <= hoy ? ultima : null
}

/** «82,4 de 113,8 km». */
export function progresoTexto(x: Expedicion): string {
  return `${formatKm(x.metros)} de ${kmTexto(metrosRuta(x.ruta))}`
}
