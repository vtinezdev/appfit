import type { Peso } from '../../../shared/db/types'
import { addDays } from '../../../shared/lib/dates'
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
