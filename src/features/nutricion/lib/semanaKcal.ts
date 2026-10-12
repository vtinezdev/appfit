import type { Entry, Objetivos } from '../../../shared/db/types'
import { parseISODate, weekDates } from '../../../shared/lib/dates'

const LETRAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

export interface DiaSemanaKcal {
  fecha: string
  /** «L», «M», «X»… */
  letra: string
  numero: number
  kcal: number
  /** 0 = sin objetivo. */
  objetivo: number
  /** Parte del anillo del día (0–1): kcal frente a su objetivo. */
  anillo: number
  futuro: boolean
  hoy: boolean
  /** Marcado como cheat day (sus kcal se ven igual: solo se quita de las medias). */
  cheat: boolean
}

/**
 * Anillo de un día: kcal frente a su objetivo, lleno al alcanzarlo (pasarse no se marca: las cifras están en texto).
 * Sin objetivo, un día con registros va lleno y uno sin ellos, vacío.
 */
export function fraccionAnillo(kcal: number, objetivo: number): number {
  if (!(kcal > 0)) return 0
  return objetivo > 0 ? Math.min(kcal / objetivo, 1) : 1
}

/**
 * Franja de la semana (lunes a domingo) que contiene `fecha`: kcal de cada día frente a su objetivo (snapshot del día o,
 * sin él, el vigente: lo resuelve `objetivosPorFecha`), como anillo de cada día.
 */
export function semanaKcal(fecha: string, entries: Pick<Entry, 'fecha' | 'kcal'>[], objetivos: Map<string, Pick<Objetivos, 'kcal'>>, hoy: string, cheatDays: ReadonlySet<string> = new Set()): DiaSemanaKcal[] {
  const fechas = weekDates(fecha)
  const kcal = new Map<string, number>()
  for (const e of entries) kcal.set(e.fecha, (kcal.get(e.fecha) ?? 0) + (Number.isFinite(e.kcal) ? e.kcal : 0))
  return fechas.map(f => {
    const d = parseISODate(f)
    const k = Math.max(0, kcal.get(f) ?? 0)
    const objetivo = f > hoy ? 0 : Math.max(0, objetivos.get(f)?.kcal ?? 0)
    return { fecha: f, letra: LETRAS[d.getDay()], numero: d.getDate(), kcal: k, objetivo, anillo: f > hoy ? 0 : fraccionAnillo(k, objetivo), futuro: f > hoy, hoy: f === hoy, cheat: cheatDays.has(f) }
  })
}
