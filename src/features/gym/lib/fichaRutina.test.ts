import { describe, expect, it } from 'vitest'
import type { Exercise, SetEntry, Workout } from '../../../shared/db/types'
import { cifrasRutina, musculosRutina, sesionesRutina, tiraMiniaturas, ultimaVezEjercicios } from './fichaRutina'

const ej = (id: number, primaryMuscles: string[], secondaryMuscles: string[] = []): Exercise =>
  ({ id, nombre: `E${id}`, nombreNorm: `e${id}`, grupo: 'Otro', primaryMuscles, secondaryMuscles })
const serie = (id: number, workoutId: number, exerciseId: number, peso: number, reps: number, extra: Partial<SetEntry> = {}): SetEntry =>
  ({ id, workoutId, exerciseId, peso, reps, orden: id, createdAt: id, ...extra })

describe('musculosRutina', () => {
  it('pondera por series objetivo, principales 1 y secundarios 0,5', () => {
    const r = musculosRutina({ exerciseIds: [1, 2], objetivos: { 1: { series: 4, repsMin: 6, repsMax: 8 } } },
      [ej(1, ['pecho'], ['triceps']), ej(2, ['espalda'], ['biceps'])])
    expect(r.principales.map(p => p.zona)).toEqual(['pecho', 'espalda', 'triceps', 'biceps'])
    expect(r.levels.pecho).toBe(5)
    expect(r.levels.cuadriceps).toBe(0)
  })
  it('sin clasificación no inventa músculos', () => {
    expect(musculosRutina({ exerciseIds: [1, 9] }, [ej(1, [])]).principales).toEqual([])
  })
})

describe('tiraMiniaturas', () => {
  it('todas si caben; si no, deja el último hueco para «+N»', () => {
    expect(tiraMiniaturas([1, 2, 3, 4, 5])).toEqual({ visibles: [1, 2, 3, 4, 5], mas: 0 })
    expect(tiraMiniaturas([1, 2, 3, 4, 5, 6, 7])).toEqual({ visibles: [1, 2, 3, 4], mas: 3 })
  })
})

const workouts: Workout[] = [
  { id: 1, inicio: 100, fin: 200, routineId: 7 },
  { id: 2, inicio: 300, fin: 400, routineId: 7 },
  { id: 3, inicio: 500, fin: 600 },
  { id: 4, inicio: 700, routineId: 7 },
]

describe('sesionesRutina', () => {
  it('solo terminadas de la rutina, recientes primero, con volumen y récords', () => {
    const sets = [serie(1, 1, 1, 80, 8), serie(2, 2, 1, 85, 8), serie(3, 4, 1, 200, 1)]
    const r = sesionesRutina(7, workouts, sets)
    expect(r.total).toBe(2)
    expect(r.ultimas.map(s => [s.id, s.volumen, s.records])).toEqual([[2, 680, 2], [1, 640, 0]])
  })
})

describe('ultimaVezEjercicios', () => {
  it('mejor serie efectiva del último entreno terminado con ese ejercicio', () => {
    const sets = [
      serie(1, 1, 1, 80, 8), serie(2, 2, 1, 82.5, 7), serie(3, 2, 1, 82.5, 6), serie(4, 2, 1, 100, 5, { tipo: 'calentamiento' }),
      serie(5, 3, 2, 60, 10), serie(6, 4, 1, 200, 1),
    ]
    const r = ultimaVezEjercicios([1, 2, 3], workouts, sets)
    expect(r.get(1)).toBe('82,5 kg × 7')
    expect(r.get(2)).toBe('60 kg × 10')
    expect(r.has(3)).toBe(false)
  })
})

describe('cifrasRutina', () => {
  it('ejercicios y series objetivo, en singular y plural', () => {
    expect(cifrasRutina(6, 18)).toBe('6 ejercicios · 18 series')
    expect(cifrasRutina(1, null)).toBe('1 ejercicio')
  })
})
