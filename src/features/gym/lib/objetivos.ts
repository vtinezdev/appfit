import type { ObjetivoEjercicio } from '../../../shared/db/types'

export const OBJETIVO_POR_DEFECTO: ObjetivoEjercicio = { series: 3, repsMin: 8, repsMax: 12 }
export const SERIES_MIN = 1
export const SERIES_MAX = 10
export const REPS_MAX = 100
export const DESCANSOS_SEG = [0, 60, 90, 120, 180] as const
export const CALENTAMIENTOS_MAX = 5

const entero = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number.isFinite(n) ? n : min)))

/**
 * Lleva un objetivo a valores válidos: series 1–10, reps 1–100 con mínimo ≤ máximo, descanso opcional (15–900 s) y
 * calentamientos opcionales (1–5; cero o menos los quita).
 */
export function sanearObjetivo(o: ObjetivoEjercicio): ObjetivoEjercicio {
  const repsMin = entero(o.repsMin, 1, REPS_MAX)
  const repsMax = Math.max(repsMin, entero(o.repsMax, 1, REPS_MAX))
  const descanso = o.descansoSeg !== undefined && o.descansoSeg > 0 ? entero(o.descansoSeg, 15, 900) : undefined
  const calentamientos = o.calentamientos !== undefined && o.calentamientos >= 1 ? entero(o.calentamientos, 1, CALENTAMIENTOS_MAX) : undefined
  return { series: entero(o.series, SERIES_MIN, SERIES_MAX), repsMin, repsMax, ...(descanso !== undefined ? { descansoSeg: descanso } : {}),
    ...(calentamientos !== undefined ? { calentamientos } : {}) }
}

/** «3 × 8–12», «4 × 5» (mismo mínimo y máximo). */
export function textoObjetivo(o: ObjetivoEjercicio): string {
  return `${o.series} × ${o.repsMin === o.repsMax ? o.repsMin : `${o.repsMin}–${o.repsMax}`}`
}

/** «2 de calentamiento», o null si el objetivo no tiene. */
export function textoCalentamientos(o: Pick<ObjetivoEjercicio, 'calentamientos'>): string | null {
  return o.calentamientos ? `${o.calentamientos} de calentamiento` : null
}
