// Grabación con el GPS del móvil: qué lecturas se aceptan y cómo se acumulan la distancia y el tiempo en marcha.
// Funciones puras; la página solo pasa las lecturas de `watchPosition` y guarda el estado.
// Una web app en iPhone deja de recibir el GPS con la pantalla bloqueada o en otra app: al volver, el hueco se une en
// línea recta (la distancia queda algo corta) y el tiempo sigue contando, porque la actividad no se ha parado.
import type { PuntoRecorrido } from '../../../shared/db/types'
import { distanciaM } from './geo'

/** Precisión máxima (m) de una lectura que se acepta: peores lecturas son ruido. */
export const PRECISION_MAXIMA_M = 35
/** Velocidad (m/s) por encima de la cual una lectura se toma por un salto del GPS (unos 54 km/h). */
export const VELOCIDAD_MAXIMA_MS = 15
/** Movimiento mínimo (m) para añadir un punto: evita sumar el temblor del GPS estando quieto. */
export const MOVIMIENTO_MINIMO_M = 4

export interface Lectura {
  lat: number
  lon: number
  /** Altitud (m), si el GPS la da. */
  ele?: number
  /** Radio de precisión horizontal (m). */
  precision: number
  /** ms. */
  t: number
}

export interface EstadoGrabacion {
  /** Tramos del recorrido: cada pausa abre uno nuevo. */
  tramos: PuntoRecorrido[][]
  distanciaM: number
  /** Segundos en marcha de los tramos ya cerrados. */
  segundosCerrados: number
  /** ms desde el que corre el tramo actual; `undefined` en pausa. */
  reanudadaEn?: number
  /** ms de la última lectura aceptada (para descartar saltos); se pierde al recargar. */
  ultimaT?: number
}

export function empezarGrabacion(ahora: number): EstadoGrabacion {
  return { tramos: [[]], distanciaM: 0, segundosCerrados: 0, reanudadaEn: ahora }
}

export type MotivoDescarte = 'pausa' | 'precision' | 'quieto' | 'salto'

/** Añade una lectura si es buena. Devuelve el estado nuevo y, si se descarta, el motivo (el estado no cambia). */
export function anadirLectura(e: EstadoGrabacion, l: Lectura): { estado: EstadoGrabacion; descarte?: MotivoDescarte } {
  if (e.reanudadaEn === undefined) return { estado: e, descarte: 'pausa' }
  if (!(l.precision <= PRECISION_MAXIMA_M)) return { estado: e, descarte: 'precision' }
  const punto: PuntoRecorrido = l.ele === undefined || !Number.isFinite(l.ele) ? [l.lat, l.lon] : [l.lat, l.lon, l.ele]
  const tramo = e.tramos[e.tramos.length - 1] ?? []
  const anterior = tramo[tramo.length - 1]
  let suma = 0
  if (anterior) {
    suma = distanciaM(anterior, punto)
    if (suma < Math.max(MOVIMIENTO_MINIMO_M, l.precision / 3)) return { estado: e, descarte: 'quieto' }
    if (e.ultimaT !== undefined && l.t > e.ultimaT && suma / ((l.t - e.ultimaT) / 1000) > VELOCIDAD_MAXIMA_MS) return { estado: e, descarte: 'salto' }
  }
  const tramos = e.tramos.length ? [...e.tramos.slice(0, -1), [...tramo, punto]] : [[punto]]
  return { estado: { ...e, tramos, distanciaM: e.distanciaM + suma, ultimaT: l.t } }
}

/** Segundos en marcha hasta `ahora`. */
export function segundosEnMarcha(e: Pick<EstadoGrabacion, 'segundosCerrados' | 'reanudadaEn'>, ahora: number): number {
  return e.segundosCerrados + (e.reanudadaEn === undefined ? 0 : Math.max(0, ahora - e.reanudadaEn) / 1000)
}

export function pausar(e: EstadoGrabacion, ahora: number): EstadoGrabacion {
  if (e.reanudadaEn === undefined) return e
  return { ...e, segundosCerrados: segundosEnMarcha(e, ahora), reanudadaEn: undefined }
}

/** Reanuda en un tramo nuevo: lo andado en pausa no cuenta ni se une con una línea. */
export function reanudar(e: EstadoGrabacion, ahora: number): EstadoGrabacion {
  if (e.reanudadaEn !== undefined) return e
  const ultimo = e.tramos[e.tramos.length - 1]
  return { ...e, tramos: ultimo && ultimo.length === 0 ? e.tramos : [...e.tramos, []], reanudadaEn: ahora, ultimaT: undefined }
}

export const enPausa = (e: Pick<EstadoGrabacion, 'reanudadaEn'>) => e.reanudadaEn === undefined
