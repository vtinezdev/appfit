// Atlas: grupos musculares trabajados por semana y ejercicios «dominados» (Vitrina). Funciones puras.
import type { Exercise, SetEntry, Workout } from '../../../shared/db/types'
import { startOfWeek, toISODate } from '../../../shared/lib/dates'
import { crearSnapshotMuscular } from '../../gym/lib/cargaMuscular'
import { ZONAS_MUSCULARES, type ZonaMuscular } from '../../gym/lib/musculos'
import { esEfectiva } from '../../gym/lib/workout'

/** Sesiones con un ejercicio a partir de las que se da por «dominado». */
export const SESIONES_DOMINADO = 3

type EntrenoAtlas = Pick<Workout, 'id' | 'inicio' | 'fin' | 'muscleSnapshot'>

/**
 * Grupos trabajados como músculo principal en un entreno (series efectivas con repeticiones), con la clasificación
 * guardada al terminar o, sin ella, la actual (como el resumen semanal de Gym).
 */
export function gruposDeEntreno(w: EntrenoAtlas, sets: readonly SetEntry[], exercises: Exercise[]): Set<ZonaMuscular> {
  const zonas = new Set<string>(ZONAS_MUSCULARES)
  const clasificacion = new Map((w.muscleSnapshot ?? crearSnapshotMuscular([...sets], exercises)).exercises.map((e) => [e.exerciseId, e]))
  const grupos = new Set<ZonaMuscular>()
  for (const s of sets) {
    if (!esEfectiva(s) || !(s.reps > 0)) continue
    for (const m of clasificacion.get(s.exerciseId)?.primaryMuscles ?? []) if (zonas.has(m)) grupos.add(m as ZonaMuscular)
  }
  return grupos
}

export interface SemanaAtlas {
  lunes: string
  grupos: Set<ZonaMuscular>
  /** Entreno con el que se completaron los 12 grupos esa semana; `null` si no se completaron. */
  completa: { workoutId: number; fecha: string } | null
}

export interface Atlas {
  /** Semanas con algún entreno terminado, en orden. */
  semanas: SemanaAtlas[]
  /** Grupos trabajados alguna vez. */
  desdeSiempre: Set<ZonaMuscular>
  /** Ejercicios con al menos 3 sesiones, de más a menos sesiones, con el entreno en que se llegó a la tercera. */
  dominados: { exerciseId: number; sesiones: number; desde: { workoutId: number; fecha: string } }[]
}

/** Atlas de los entrenos terminados. `porWorkout`: series de cada entreno. */
export function calcularAtlas(workouts: readonly EntrenoAtlas[], porWorkout: ReadonlyMap<number, SetEntry[]>, exercises: Exercise[]): Atlas {
  const semanas = new Map<string, SemanaAtlas>()
  const desdeSiempre = new Set<ZonaMuscular>()
  const sesiones = new Map<number, number>()
  const desde = new Map<number, { workoutId: number; fecha: string }>()
  for (const w of [...workouts].filter((x) => x.fin !== undefined).sort((a, b) => a.inicio - b.inicio)) {
    const sets = porWorkout.get(w.id) ?? []
    const fecha = toISODate(new Date(w.inicio))
    const lunes = startOfWeek(fecha)
    const semana = semanas.get(lunes) ?? { lunes, grupos: new Set<ZonaMuscular>(), completa: null }
    for (const g of gruposDeEntreno(w, sets, exercises)) { semana.grupos.add(g); desdeSiempre.add(g) }
    if (semana.completa === null && semana.grupos.size === ZONAS_MUSCULARES.length) semana.completa = { workoutId: w.id, fecha }
    semanas.set(lunes, semana)
    for (const id of new Set(sets.filter((s) => esEfectiva(s) && s.reps > 0).map((s) => s.exerciseId))) {
      const n = (sesiones.get(id) ?? 0) + 1
      sesiones.set(id, n)
      if (n === SESIONES_DOMINADO) desde.set(id, { workoutId: w.id, fecha })
    }
  }
  return {
    semanas: [...semanas.values()].sort((a, b) => a.lunes.localeCompare(b.lunes)),
    desdeSiempre,
    dominados: [...sesiones].filter(([, n]) => n >= SESIONES_DOMINADO).map(([exerciseId, n]) => ({ exerciseId, sesiones: n, desde: desde.get(exerciseId)! })).sort((a, b) => b.sesiones - a.sesiones),
  }
}
