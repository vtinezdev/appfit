import type { Exercise, SetEntry, Workout } from '../../../shared/db/types'
import { toISODate } from '../../../shared/lib/dates'
import { crearSnapshotMuscular } from './cargaMuscular'
import { MUSCULOS, ZONAS_MUSCULARES, type ZonaMuscular } from './musculos'
import { esEfectiva, volumenSets } from './workout'

export interface ResumenSemanal {
  sesiones: number
  duracionMs: number
  /** Series efectivas con repeticiones (no cuentan los calentamientos). */
  series: number
  volumen: number
  /** Series por grupo muscular: principal cuenta 1 y secundario 0,5. Solo grupos con trabajo, de más a menos. */
  porMusculo: { musculo: ZonaMuscular; nombre: string; series: number }[]
  /** Series efectivas de ejercicios sin clasificación muscular (no se reparten). */
  sinClasificar: number
}

const PRINCIPAL = 1
const SECUNDARIO = 0.5

/**
 * Resumen de la semana (lunes-domingo) que empieza en `lunes`. Cuenta solo entrenos terminados cuyo inicio cae
 * en esa semana. Reutiliza la clasificación guardada en el entreno (`muscleSnapshot`) y, si no existe, la actual.
 */
export function resumenSemanal(lunes: string, domingo: string, workouts: Workout[], sets: SetEntry[], exercises: Exercise[]): ResumenSemanal {
  const delPeriodo = workouts.filter((w) => w.fin !== undefined && toISODate(new Date(w.inicio)) >= lunes && toISODate(new Date(w.inicio)) <= domingo)
  const porWorkout = new Map<number, SetEntry[]>()
  for (const s of sets) porWorkout.set(s.workoutId, [...(porWorkout.get(s.workoutId) ?? []), s])

  const acumulado = new Map<ZonaMuscular, number>()
  let series = 0
  let volumen = 0
  let sinClasificar = 0
  let duracionMs = 0
  const zonas = new Set<string>(ZONAS_MUSCULARES)

  for (const w of delPeriodo) {
    duracionMs += (w.fin ?? w.inicio) - w.inicio
    const ss = porWorkout.get(w.id) ?? []
    volumen += volumenSets(ss)
    const clasificacion = new Map((w.muscleSnapshot ?? crearSnapshotMuscular(ss, exercises)).exercises.map((e) => [e.exerciseId, e]))
    for (const s of ss) {
      if (!esEfectiva(s) || !(s.reps > 0)) continue
      series++
      const c = clasificacion.get(s.exerciseId)
      const principales = [...new Set(c?.primaryMuscles ?? [])].filter((m) => zonas.has(m)) as ZonaMuscular[]
      if (!principales.length) { sinClasificar++; continue }
      const secundarios = [...new Set(c?.secondaryMuscles ?? [])].filter((m) => zonas.has(m) && !principales.includes(m as ZonaMuscular)) as ZonaMuscular[]
      for (const m of principales) acumulado.set(m, (acumulado.get(m) ?? 0) + PRINCIPAL)
      for (const m of secundarios) acumulado.set(m, (acumulado.get(m) ?? 0) + SECUNDARIO)
    }
  }

  const porMusculo = [...acumulado]
    .map(([musculo, n]) => ({ musculo, nombre: MUSCULOS[musculo], series: n }))
    .sort((a, b) => b.series - a.series || a.nombre.localeCompare(b.nombre, 'es'))
  return { sesiones: delPeriodo.length, duracionMs, series, volumen, porMusculo, sinClasificar }
}
