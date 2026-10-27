import { addDays } from '../../../shared/lib/dates'

export interface BarraAgua {
  fecha: string
  /** ml bebidos; 0 si ese día no hay registro. */
  ml: number
  /** Alto de la barra (0–1) frente al máximo del periodo (o el objetivo, si es mayor). */
  alto: number
  enObjetivo: boolean
}

export interface ResumenBarrasAgua {
  barras: BarraAgua[]
  /** Altura de la línea del objetivo (0–1); `null` sin objetivo. */
  lineaObjetivo: number | null
  /** Media de los días con registro (ml); `null` sin registros. */
  media: number | null
  diasConRegistro: number
  diasEnObjetivo: number
}

/**
 * Lo bebido cada día de los últimos `dias` (hoy incluido) como barras, con la línea del objetivo: la evolución del agua
 * en la hoja de Inicio. La escala es el máximo del periodo o el objetivo, el mayor, para que la línea siempre quepa.
 */
export function barrasAgua(registros: { fecha: string; ml: number }[], hoy: string, dias: number, objetivoMl: number | null): ResumenBarrasAgua {
  const porFecha = new Map(registros.map((r) => [r.fecha, r.ml]))
  const fechas = Array.from({ length: dias }, (_, i) => addDays(hoy, i - dias + 1))
  const valores = fechas.map((f) => Math.max(0, porFecha.get(f) ?? 0))
  const escala = Math.max(...valores, objetivoMl ?? 0, 1)
  const con = valores.filter((v) => v > 0)
  const barras = fechas.map((fecha, i) => ({ fecha, ml: valores[i], alto: valores[i] / escala, enObjetivo: objetivoMl !== null && valores[i] >= objetivoMl }))
  return {
    barras,
    lineaObjetivo: objetivoMl === null ? null : objetivoMl / escala,
    media: con.length ? Math.round(con.reduce((t, v) => t + v, 0) / con.length) : null,
    diasConRegistro: con.length,
    diasEnObjetivo: barras.filter((b) => b.enObjetivo).length,
  }
}
