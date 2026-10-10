// Récords recientes de un ejercicio, para completar el aviso de Élite: si además lleva varias sesiones sin récord, se dice.
// Usa la misma detección que Gym (`gym/lib/records`): series efectivas frente a los entrenos terminados anteriores.
import type { SetEntry, Workout } from '../../../shared/db/types'
import { acumularComparables, recordsFrenteA, type GruposComparables } from '../../gym/lib/records'

/** Sesiones seguidas sin récord a partir de las que el aviso de Élite lo menciona. */
export const SESIONES_SIN_RECORD = 4

/**
 * Sesiones terminadas más recientes del ejercicio, seguidas, sin ningún récord. La primera sesión de su historial no cuenta
 * (no hay con qué comparar). `sets` puede traer series de otros ejercicios: se filtran.
 */
export function sesionesSinRecord(exerciseId: number, workouts: readonly Workout[], sets: readonly SetEntry[]): number {
  const propias = new Map<number, SetEntry[]>()
  for (const s of sets) {
    if (s.exerciseId !== exerciseId) continue
    const lista = propias.get(s.workoutId)
    if (lista) lista.push(s)
    else propias.set(s.workoutId, [s])
  }
  const sesiones = workouts.filter((w) => w.fin !== undefined && propias.has(w.id)).sort((a, b) => a.inicio - b.inicio)
  const historial: GruposComparables = new Map()
  let sin = 0
  for (const [i, w] of sesiones.entries()) {
    const series = propias.get(w.id)!
    sin = i > 0 && recordsFrenteA(series, historial).length === 0 ? sin + 1 : 0
    acumularComparables(historial, series)
  }
  return sin
}
