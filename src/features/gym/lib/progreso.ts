import { claveComparacion, repsComparables, pesoComparable } from './ejecucion'
import type { ModoCarga, SetEntry, Workout } from '../../../shared/db/types'
import { modoCarga } from './carga'
import { efectivas, epley1RM, volumenSets } from './workout'

/** Solo sesiones terminadas y series del mismo modo; asistencia no invierte la progresión. */
export function datosProgreso(series: SetEntry[], workouts: Pick<Workout, 'id' | 'inicio' | 'fin'>[], modo: ModoCarga, variante?: string) {
  const sesiones = new Map(workouts.filter(w => w.fin !== undefined).map(w => [w.id, w]))
  const grupos = new Map<number, SetEntry[]>()
  for (const s of efectivas(series).filter(s => repsComparables(s) > 0 && !s.bajadas?.length && modoCarga(s) === modo && claveComparacion(s) === (variante ?? claveComparacion({ modoCarga: modo })))) {
    if (!sesiones.has(s.workoutId)) continue
    grupos.set(s.workoutId, [...(grupos.get(s.workoutId) ?? []), s])
  }
  return [...grupos].map(([workoutId, ss]) => ({
    workoutId, inicio: sesiones.get(workoutId)!.inicio,
    pesoMax: Math.max(...ss.map(pesoComparable)),
    oneRM: modo === 'externa' && !ss[0].ejecucion && !ss[0].excentricaSeg && !ss[0].soloNegativas ? Math.max(...ss.map(s => epley1RM(s.peso, s.reps))) : null,
    asistencia: modo === 'asistencia' ? Math.min(...ss.map(pesoComparable)) : null,
    reps: Math.max(...ss.map(repsComparables)), volumen: volumenSets(ss),
  })).sort((a, b) => a.inicio - b.inicio || a.workoutId - b.workoutId)
}
