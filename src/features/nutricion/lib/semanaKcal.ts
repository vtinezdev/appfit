import type { Entry, Objetivos } from '../../../shared/db/types'
import { parseISODate, weekDates } from '../../../shared/lib/dates'

const LETRAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
const AIRE = 1.15

export interface DiaSemanaKcal {
  fecha: string
  /** «L», «M», «X»… */
  letra: string
  numero: number
  kcal: number
  /** 0 = sin objetivo. */
  objetivo: number
  /** Alto de la barra (0–1) y de la línea del objetivo (null sin objetivo), en una escala común a la semana. */
  alto: number
  meta: number | null
  futuro: boolean
  hoy: boolean
}

/**
 * Franja de la semana (lunes a domingo) que contiene `fecha`: kcal de cada día frente a su objetivo (snapshot del día o,
 * sin él, el vigente: lo resuelve `objetivosPorFecha`). Barras y líneas comparten la escala del mayor valor de la semana (con un 15 % de aire).
 */
export function semanaKcal(fecha: string, entries: Pick<Entry, 'fecha' | 'kcal'>[], objetivos: Map<string, Pick<Objetivos, 'kcal'>>, hoy: string): DiaSemanaKcal[] {
  const fechas = weekDates(fecha)
  const kcal = new Map<string, number>()
  for (const e of entries) kcal.set(e.fecha, (kcal.get(e.fecha) ?? 0) + (Number.isFinite(e.kcal) ? e.kcal : 0))
  const dias = fechas.map(f => ({ f, kcal: Math.max(0, kcal.get(f) ?? 0), objetivo: f > hoy ? 0 : Math.max(0, objetivos.get(f)?.kcal ?? 0) }))
  // Un 15 % de aire arriba: la línea del objetivo más alto no se pega a la letra del día.
  const escala = Math.max(1, ...dias.map(d => Math.max(d.kcal, d.objetivo))) * AIRE
  return dias.map(({ f, kcal, objetivo }) => {
    const d = parseISODate(f)
    return { fecha: f, letra: LETRAS[d.getDay()], numero: d.getDate(), kcal, objetivo, alto: kcal / escala, meta: objetivo > 0 ? objetivo / escala : null, futuro: f > hoy, hoy: f === hoy }
  })
}
