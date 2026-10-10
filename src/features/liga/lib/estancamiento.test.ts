import { describe, expect, it } from 'vitest'
import type { SetEntry, Workout } from '../../../shared/db/types'
import { sesionesSinRecord } from './estancamiento'

let id = 1
/** Un entreno terminado por peso, un día tras otro; el ejercicio 2 siempre igual, como ruido. */
function historial(pesos: number[], opciones: { activoAlFinal?: boolean } = {}) {
  const workouts: Workout[] = []
  const sets: SetEntry[] = []
  pesos.forEach((peso, i) => {
    const inicio = Date.UTC(2026, 8, 1 + i)
    const ultimo = i === pesos.length - 1 && opciones.activoAlFinal
    const w: Workout = { id: id++, inicio, ...(ultimo ? {} : { fin: inicio + 3_600_000 }) }
    workouts.push(w)
    for (const exerciseId of [1, 2]) sets.push({ id: id++, workoutId: w.id, exerciseId, orden: exerciseId, reps: 8, peso: exerciseId === 1 ? peso : 50, createdAt: inicio })
  })
  return { workouts, sets }
}

describe('sesiones sin récord', () => {
  it('cuenta las sesiones recientes seguidas sin récord del ejercicio', () => {
    const { workouts, sets } = historial([60, 62.5, 65, 65, 65, 62.5, 65])
    expect(sesionesSinRecord(1, workouts, sets)).toBe(4)
    expect(sesionesSinRecord(2, workouts, sets)).toBe(6)
  })

  it('un récord reinicia la cuenta; la primera sesión no cuenta y el entreno activo tampoco', () => {
    expect(sesionesSinRecord(1, ...Object.values(historial([60, 60, 60, 62.5])) as [Workout[], SetEntry[]])).toBe(0)
    expect(sesionesSinRecord(1, ...Object.values(historial([60])) as [Workout[], SetEntry[]])).toBe(0)
    expect(sesionesSinRecord(1, ...Object.values(historial([60, 60, 70], { activoAlFinal: true })) as [Workout[], SetEntry[]])).toBe(1)
    expect(sesionesSinRecord(3, [], [])).toBe(0)
  })
})
