import type { Peso } from '../../../shared/db/types'
import { addDays } from '../../../shared/lib/dates'
import { round1 } from '../../../shared/lib/format'

export const PESO_MIN = 20
export const PESO_MAX = 300
/** Días que abarca la mini gráfica (hoy incluido). */
export const DIAS_SERIE = 30
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
  /** Pesajes de los últimos 30 días (hoy incluido), de más antiguo a más reciente. */
  serie30d: { fecha: string; kg: number }[]
}

/** Resumen de los pesajes a fecha `hoy` (los posteriores a `hoy` se ignoran). `null` si no hay ninguno. */
export function tendenciaPeso(pesos: Peso[], hoy: string): TendenciaPeso | null {
  const hasta = pesos.filter((p) => p.fecha <= hoy).sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
  const ultimo = hasta[hasta.length - 1]
  if (!ultimo) return null
  const limite = addDays(ultimo.fecha, -DIAS_VARIACION)
  const previos = hasta.filter((p) => p.fecha <= limite)
  const referencia = previos[previos.length - 1]
  const desde = addDays(hoy, -(DIAS_SERIE - 1))
  return {
    actual: ultimo.kg,
    fecha: ultimo.fecha,
    variacion7d: referencia ? round1(ultimo.kg - referencia.kg) : null,
    serie30d: hasta.filter((p) => p.fecha >= desde).map((p) => ({ fecha: p.fecha, kg: p.kg })),
  }
}

/**
 * Path SVG («M x y L x y…») de una línea que reparte los valores a intervalos iguales dentro de ancho×alto
 * (el mayor arriba). Sin valores: cadena vacía. Un valor, o todos iguales: línea horizontal a media altura.
 */
export function puntosSparkline(valores: number[], ancho: number, alto: number): string {
  if (valores.length === 0) return ''
  const n = (x: number) => String(Math.round(x * 100) / 100)
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  if (valores.length === 1 || max === min) return `M0 ${n(alto / 2)} L${n(ancho)} ${n(alto / 2)}`
  return valores
    .map((v, i) => {
      const x = (i / (valores.length - 1)) * ancho
      const y = alto - ((v - min) / (max - min)) * alto
      return `${i === 0 ? 'M' : 'L'}${n(x)} ${n(y)}`
    })
    .join(' ')
}
