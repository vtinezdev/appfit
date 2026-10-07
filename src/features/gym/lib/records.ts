import type { SetEntry } from '../../../shared/db/types'
import { epley1RM, esEfectiva } from './workout'

type Serie = Pick<SetEntry, 'exerciseId' | 'reps' | 'peso'> & { tipo?: SetEntry['tipo'] }

export type TipoRecord = 'peso' | '1rm' | 'reps'

export interface RecordEjercicio {
  exerciseId: number
  tipo: TipoRecord
  /** Peso máximo (kg), 1RM estimado (kg) o repeticiones. */
  valor: number
  /** Valor anterior que se supera. */
  anterior: number
  /** Solo en `reps`: el peso con el que se consiguieron. */
  peso?: number
}

const validas = (s: Serie) => esEfectiva(s) && s.reps > 0 && s.peso > 0

/**
 * Récords de una sesión frente a las series de entrenos ANTERIORES. Solo series efectivas con reps y peso positivos.
 * Un ejercicio sin historial previo no genera récords (no hay con qué comparar). Las repeticiones solo se comparan
 * con un peso que ya se había usado antes; los pesos nuevos más altos aparecen como récord de peso.
 */
export function detectarRecords(setsSesion: Serie[], setsAnteriores: Serie[]): RecordEjercicio[] {
  const previas = new Map<number, Serie[]>()
  for (const s of setsAnteriores.filter(validas)) previas.set(s.exerciseId, [...(previas.get(s.exerciseId) ?? []), s])
  const actuales = new Map<number, Serie[]>()
  for (const s of setsSesion.filter(validas)) actuales.set(s.exerciseId, [...(actuales.get(s.exerciseId) ?? []), s])

  const records: RecordEjercicio[] = []
  for (const [exerciseId, ahora] of actuales) {
    const antes = previas.get(exerciseId)
    if (!antes?.length) continue
    const maxPesoAntes = Math.max(...antes.map((s) => s.peso))
    const maxPesoAhora = Math.max(...ahora.map((s) => s.peso))
    if (maxPesoAhora > maxPesoAntes) records.push({ exerciseId, tipo: 'peso', valor: maxPesoAhora, anterior: maxPesoAntes })

    const max1rmAntes = Math.max(...antes.map((s) => epley1RM(s.peso, s.reps)))
    const max1rmAhora = Math.max(...ahora.map((s) => epley1RM(s.peso, s.reps)))
    if (max1rmAhora > max1rmAntes) records.push({ exerciseId, tipo: '1rm', valor: max1rmAhora, anterior: max1rmAntes })

    const repsAntesPorPeso = new Map<number, number>()
    for (const s of antes) repsAntesPorPeso.set(s.peso, Math.max(repsAntesPorPeso.get(s.peso) ?? 0, s.reps))
    const repsAhoraPorPeso = new Map<number, number>()
    for (const s of ahora) repsAhoraPorPeso.set(s.peso, Math.max(repsAhoraPorPeso.get(s.peso) ?? 0, s.reps))
    for (const [peso, reps] of [...repsAhoraPorPeso].sort((a, b) => b[0] - a[0])) {
      const previo = repsAntesPorPeso.get(peso)
      if (previo !== undefined && reps > previo) records.push({ exerciseId, tipo: 'reps', valor: reps, anterior: previo, peso })
    }
  }
  return records
}

/**
 * Récords de un entreno concreto, comparándolo solo con los entrenos anteriores a él (por `inicio`).
 * `sets` son las series de todos los entrenos.
 */
export function recordsDeEntreno(
  workoutId: number,
  workouts: { id: number; inicio: number }[],
  sets: (Serie & { workoutId: number })[],
): RecordEjercicio[] {
  const w = workouts.find((x) => x.id === workoutId)
  if (!w) return []
  const anteriores = new Set(workouts.filter((x) => x.id !== workoutId && x.inicio < w.inicio).map((x) => x.id))
  return detectarRecords(sets.filter((s) => s.workoutId === workoutId), sets.filter((s) => anteriores.has(s.workoutId)))
}

/** «Peso máximo 105 kg», «1RM estimado 120 kg», «7 reps con 100 kg». */
export function describirRecord(r: RecordEjercicio, formato: (n: number) => string): string {
  if (r.tipo === 'peso') return `Peso máximo: ${formato(r.valor)} kg (antes ${formato(r.anterior)})`
  if (r.tipo === '1rm') return `1RM estimado: ${formato(r.valor)} kg (antes ${formato(r.anterior)})`
  return `${formato(r.valor)} reps con ${formato(r.peso ?? 0)} kg (antes ${formato(r.anterior)})`
}
