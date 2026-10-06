import type { Exercise, SetEntry, Workout, WorkoutExerciseMuscles, WorkoutMuscleSnapshot } from '../../../shared/db/types'
import { catalogoDeLocal } from './selectorEjercicios'
import { ZONAS_MUSCULARES, type ZonaMuscular } from './musculos'

/** Heurística de trabajo registrado, no medida fisiológica de intensidad. */
export const ESTIMULO_MUSCULAR = {
  primary: 1, secondary: 0.5, repsReference: 8, repsCeiling: 30, minimumWeightFactor: 0.75,
} as const
export const UMBRALES_MUSCULARES = [0.1, 0.25, 0.5, 0.8, 1] as const
export type NivelMuscular = 0 | 1 | 2 | 3 | 4 | 5
const zonas = new Set<string>(ZONAS_MUSCULARES)
const positivo = (n: number) => Number.isFinite(n) && n > 0 ? n : 0
const sumarFinito = (a: number, b: number) => Math.min(Number.MAX_VALUE, a + b)

export interface CargaEjercicio {
  stimulus: number
  sets: number
  reps: number
  externalVolume: number
}
export interface AporteMuscular extends CargaEjercicio {
  exerciseId: number
  nombre: string
  role: 'primary' | 'secondary'
}
export interface TrabajoMuscular {
  muscles: Record<ZonaMuscular, { score: number; exercises: AporteMuscular[] }>
  coverage: { classified: number; total: number; unclassifiedSets: number }
  unclassified: string[]
}

/** Serie positiva; 0 kg no inventa masa corporal. Peso relativo al máximo DEL MISMO ejercicio/sesión. */
export function calcularCargaEjercicio(series: Pick<SetEntry, 'reps' | 'peso'>[]): CargaEjercicio {
  const validas = series.filter(s => positivo(s.reps) > 0)
  let maxPeso = 0
  for (const s of validas) maxPeso = Math.max(maxPeso, positivo(s.peso))
  const result: CargaEjercicio = { stimulus: 0, sets: validas.length, reps: 0, externalVolume: 0 }
  for (const s of validas) {
    const peso = positivo(s.peso)
    const weightFactor = peso > 0 && maxPeso > 0 ? ESTIMULO_MUSCULAR.minimumWeightFactor + (1 - ESTIMULO_MUSCULAR.minimumWeightFactor) * peso / maxPeso : 1
    result.stimulus += Math.min(s.reps, ESTIMULO_MUSCULAR.repsCeiling) / ESTIMULO_MUSCULAR.repsReference * weightFactor
    result.reps = sumarFinito(result.reps, s.reps)
    result.externalVolume = sumarFinito(result.externalVolume, peso * s.reps)
  }
  return result
}

/** Captura semántica sin modificar el ejercicio; oficial usa la definición vigente, personalizado su clasificación. */
export function crearSnapshotMuscular(series: Pick<SetEntry, 'exerciseId'>[], ejercicios: Exercise[]): WorkoutMuscleSnapshot {
  const porId = new Map(ejercicios.map(e => [e.id, e]))
  return { version: 1, exercises: [...new Set(series.map(s => s.exerciseId))].map(id => {
    const e = porId.get(id)
    const c = e && catalogoDeLocal(e)
    return { exerciseId: id, nombre: e?.nombre ?? 'Ejercicio no disponible', ...(e?.catalogId ? { catalogId: e.catalogId } : c ? { catalogId: c.id } : {}),
      primaryMuscles: [...new Set(c?.primaryMuscles ?? e?.primaryMuscles ?? [])], secondaryMuscles: [...new Set(c?.secondaryMuscles ?? e?.secondaryMuscles ?? [])] }
  }) }
}

export function agregarCargaMuscular(series: Pick<SetEntry, 'exerciseId' | 'reps' | 'peso'>[], clasificaciones: WorkoutExerciseMuscles[]): TrabajoMuscular {
  const muscles = Object.fromEntries(ZONAS_MUSCULARES.map(m => [m, { score: 0, exercises: [] as AporteMuscular[] }])) as TrabajoMuscular['muscles']
  const porEjercicio = new Map<number, Pick<SetEntry, 'exerciseId' | 'reps' | 'peso'>[]>()
  for (const s of series) { const arr = porEjercicio.get(s.exerciseId) ?? []; arr.push(s); porEjercicio.set(s.exerciseId, arr) }
  const clasificacion = new Map(clasificaciones.map(e => [e.exerciseId, e]))
  const result: TrabajoMuscular = { muscles, coverage: { classified: 0, total: 0, unclassifiedSets: 0 }, unclassified: [] }
  for (const [id, sets] of porEjercicio) {
    const load = calcularCargaEjercicio(sets)
    if (!load.sets) continue
    result.coverage.total++
    const e = clasificacion.get(id)
    const primary = [...new Set(e?.primaryMuscles ?? [])].filter(m => zonas.has(m)) as ZonaMuscular[]
    const secondary = [...new Set(e?.secondaryMuscles ?? [])].filter(m => zonas.has(m) && !primary.includes(m as ZonaMuscular)) as ZonaMuscular[]
    if (!primary.length) {
      result.coverage.unclassifiedSets += load.sets
      result.unclassified.push(e?.nombre ?? 'Ejercicio no disponible')
      continue // No adivinar reparto anatómico de "Cuerpo completo" o categorías desconocidas.
    }
    result.coverage.classified++
    for (const [ids, role, factor] of [[primary, 'primary', ESTIMULO_MUSCULAR.primary], [secondary, 'secondary', ESTIMULO_MUSCULAR.secondary]] as const) {
      for (const m of ids) {
        const contribution = load.stimulus * factor
        muscles[m].score += contribution
        muscles[m].exercises.push({ ...load, stimulus: contribution, exerciseId: id, nombre: e!.nombre, role })
      }
    }
  }
  return result
}

/** Misma escala visual para sesión corta/larga: referencia = el mayor trabajo de ESTA sesión. */
export function normalizarCargaMuscular(scores: Partial<Record<ZonaMuscular, number>>): Record<ZonaMuscular, NivelMuscular> {
  let max = 0
  for (const m of ZONAS_MUSCULARES) max = Math.max(max, positivo(scores[m] ?? 0))
  return Object.fromEntries(ZONAS_MUSCULARES.map(m => {
    const score = positivo(scores[m] ?? 0)
    return [m, score && max ? UMBRALES_MUSCULARES.findIndex(limit => score / max <= limit) + 1 : 0]
  })) as Record<ZonaMuscular, NivelMuscular>
}

export function trabajoMuscularWorkout(workout: Pick<Workout, 'muscleSnapshot'>, series: SetEntry[], ejercicios: Exercise[]) {
  const snapshot = workout.muscleSnapshot ?? crearSnapshotMuscular(series, ejercicios)
  const work = agregarCargaMuscular(series, snapshot.exercises)
  const levels = normalizarCargaMuscular(Object.fromEntries(ZONAS_MUSCULARES.map(m => [m, work.muscles[m].score])))
  return { ...work, levels, legacy: workout.muscleSnapshot === undefined }
}
export type ResumenMuscular = ReturnType<typeof trabajoMuscularWorkout>
