import type { Workout } from '../../../shared/db/types'
import { addDays, monthDates, startOfWeek, toISODate } from '../../../shared/lib/dates'

/** 0 = sin entreno; 1…5 = volumen del día respecto al día de más volumen del mes (rampa `muscle-1…5`). */
export type NivelDia = 0 | 1 | 2 | 3 | 4 | 5

export interface DiaCalendario {
  fecha: string
  /** Días de relleno de la semana anterior o siguiente: se dibujan vacíos. */
  delMes: boolean
  hoy: boolean
  futuro: boolean
  /** Entrenos terminados que empezaron ese día, del más reciente al más antiguo. */
  workoutIds: number[]
  volumen: number
  nivel: NivelDia
}

/** Cuantiza un volumen frente al máximo del mes. Un día entrenado nunca queda en 0 (p. ej. solo peso corporal). */
export function nivelVolumen(volumen: number, maximo: number): NivelDia {
  if (!(maximo > 0) || !(volumen > 0)) return 1
  return Math.min(5, Math.max(1, Math.ceil((volumen / maximo) * 5))) as NivelDia
}

/**
 * Semanas (lunes a domingo) del mes que contiene `mes`, con los entrenos terminados de cada día y su nivel de volumen,
 * cuantizado respecto al día de más volumen de ese mes. Sin contador de días seguidos.
 */
export function calendarioMes(mes: string, workouts: Pick<Workout, 'id' | 'inicio' | 'fin'>[], volumenDe: (workoutId: number) => number, hoy: string): DiaCalendario[][] {
  const dias = monthDates(mes)
  const delMes = new Set(dias)
  const porDia = new Map<string, Pick<Workout, 'id' | 'inicio'>[]>()
  for (const w of workouts) {
    if (w.fin === undefined) continue
    const fecha = toISODate(new Date(w.inicio))
    if (delMes.has(fecha)) porDia.set(fecha, [...(porDia.get(fecha) ?? []), w])
  }
  const volumenDia = new Map([...porDia].map(([fecha, ws]) => [fecha, ws.reduce((t, w) => t + volumenDe(w.id), 0)]))
  const maximo = Math.max(0, ...volumenDia.values())
  const semanas: DiaCalendario[][] = []
  for (let lunes = startOfWeek(dias[0]); lunes <= dias[dias.length - 1]; lunes = addDays(lunes, 7)) {
    semanas.push(Array.from({ length: 7 }, (_, i) => {
      const fecha = addDays(lunes, i)
      const ws = delMes.has(fecha) ? [...(porDia.get(fecha) ?? [])].sort((a, b) => b.inicio - a.inicio) : []
      const volumen = volumenDia.get(fecha) ?? 0
      return { fecha, delMes: delMes.has(fecha), hoy: fecha === hoy, futuro: fecha > hoy, workoutIds: ws.map(w => w.id), volumen, nivel: ws.length ? nivelVolumen(volumen, maximo) : 0 }
    }))
  }
  return semanas
}
