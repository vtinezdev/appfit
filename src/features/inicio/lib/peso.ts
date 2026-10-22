import type { Peso } from '../../../shared/db/types'
import { addDays, diasEntre } from '../../../shared/lib/dates'
import { formatNumber, round1 } from '../../../shared/lib/format'

export const PESO_MIN = 20
export const PESO_MAX = 300
/** Antigüedad mínima del pesaje con el que se compara la variación. */
export const DIAS_VARIACION = 7

/** Peso válido (finito, entre 20 y 300 kg), redondeado a 1 decimal; `null` si no lo es. */
export function validarPeso(kg: number): number | null {
  if (!Number.isFinite(kg)) return null
  const r = round1(kg)
  return r >= PESO_MIN && r <= PESO_MAX ? r : null
}

export interface TendenciaPeso {
  actual: number
  /** Fecha del último pesaje. */
  fecha: string
  /** actual − último pesaje con fecha ≤ fecha del actual − 7 días; `null` si no hay ninguno tan antiguo. */
  variacion7d: number | null
}

/** Resumen de los pesajes a fecha `hoy` (los posteriores a `hoy` se ignoran). `null` si no hay ninguno. */
export function tendenciaPeso(pesos: Peso[], hoy: string): TendenciaPeso | null {
  const hasta = pesos.filter((p) => p.fecha <= hoy).sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
  const ultimo = hasta[hasta.length - 1]
  if (!ultimo) return null
  const limite = addDays(ultimo.fecha, -DIAS_VARIACION)
  const previos = hasta.filter((p) => p.fecha <= limite)
  const referencia = previos[previos.length - 1]
  return {
    actual: ultimo.kg,
    fecha: ultimo.fecha,
    variacion7d: referencia ? round1(ultimo.kg - referencia.kg) : null,
  }
}

/** «−0,6 kg en 7 días» (con el signo menos tipográfico). Sin juicio de valor: el mismo tono suba o baje. */
export function fraseVariacion(v: number): string {
  if (v === 0) return 'Sin cambios en 7 días'
  return `${v < 0 ? '−' : '+'}${formatNumber(Math.abs(v), 1)} kg en 7 días`
}

export interface PuntoPeso {
  fecha: string
  kg: number
  /** Media de los pesajes de los 7 días naturales que acaban en `fecha` (ella incluida). */
  media: number
}

/** Ventana de la media móvil, en días naturales. */
export const VENTANA_MEDIA_DIAS = 7

/**
 * Pesajes con su media móvil de 7 días: para cada fecha, la media de los pesajes de los 7 días naturales que
 * acaban en ella (no de los 7 últimos pesajes). Ordenados por fecha; la media se redondea a 2 decimales.
 */
export function mediaMovilPeso(pesos: Pick<Peso, 'fecha' | 'kg'>[]): PuntoPeso[] {
  const ordenados = [...pesos].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0))
  return ordenados.map((p) => {
    const desde = addDays(p.fecha, -(VENTANA_MEDIA_DIAS - 1))
    const ventana = ordenados.filter((q) => q.fecha >= desde && q.fecha <= p.fecha)
    const media = ventana.reduce((a, q) => a + q.kg, 0) / ventana.length
    return { fecha: p.fecha, kg: p.kg, media: Math.round(media * 100) / 100 }
  })
}

/** Pesajes que necesita la media de 7 días para sustituir al último pesaje como cifra principal. */
export const PESAJES_MEDIA = 2

/**
 * Media de 7 días en la fecha del último pesaje (hasta `hoy`) y cuántos pesajes entran en ella. Con menos de
 * `PESAJES_MEDIA` la media sería el propio pesaje: la tarjeta sigue enseñando el último. `null` sin pesajes.
 */
export function mediaSemanaPeso(pesos: Pick<Peso, 'fecha' | 'kg'>[], hoy: string): { media: number; pesajes: number } | null {
  const hasta = pesos.filter((p) => p.fecha <= hoy)
  const puntos = mediaMovilPeso(hasta)
  const ultimo = puntos[puntos.length - 1]
  if (!ultimo) return null
  const desde = addDays(ultimo.fecha, -(VENTANA_MEDIA_DIAS - 1))
  return { media: round1(ultimo.media), pesajes: puntos.filter((p) => p.fecha >= desde).length }
}

/** Tramo del ritmo semanal, en días naturales que acaban en `hoy`. */
export const DIAS_RITMO = 21
/** Mínimos para dar un ritmo: pesajes en el tramo y días entre el primero y el último. */
export const PESAJES_RITMO = 4
export const SPAN_RITMO_DIAS = 14

/**
 * Ritmo del peso en kg por semana: pendiente (regresión lineal por mínimos cuadrados) de la media móvil de 7 días
 * en los últimos 21 días. Solo con ≥ 4 pesajes que abarquen ≥ 14 días; si no, `null`. Redondeado a 0,1.
 */
export function ritmoSemanal(pesos: Pick<Peso, 'fecha' | 'kg'>[], hoy: string): number | null {
  const desde = addDays(hoy, -(DIAS_RITMO - 1))
  const tramo = mediaMovilPeso(pesos.filter((p) => p.fecha <= hoy)).filter((p) => p.fecha >= desde)
  if (tramo.length < PESAJES_RITMO) return null
  if (diasEntre(tramo[0].fecha, tramo[tramo.length - 1].fecha) < SPAN_RITMO_DIAS) return null
  const xs = tramo.map((p) => diasEntre(desde, p.fecha))
  const mx = xs.reduce((a, x) => a + x, 0) / xs.length
  const my = tramo.reduce((a, p) => a + p.media, 0) / tramo.length
  let num = 0
  let den = 0
  tramo.forEach((p, i) => {
    num += (xs[i] - mx) * (p.media - my)
    den += (xs[i] - mx) ** 2
  })
  const r = round1((num / den) * 7)
  return r === 0 ? 0 : r
}

/** «−0,3 kg/sem» (signo menos tipográfico) o «Estable» si no llega a 0,1 kg por semana. Mismo tono suba o baje. */
export function fraseRitmo(kgSemana: number): string {
  if (kgSemana === 0) return 'Estable'
  return `${kgSemana < 0 ? '−' : '+'}${formatNumber(Math.abs(kgSemana), 1)} kg/sem`
}
