import { describe, expect, it } from 'vitest'
import { detectarRecords } from './records'

const s = (exerciseId: number, peso: number, reps: number, tipo?: 'calentamiento') => ({ exerciseId, peso, reps, ...(tipo ? { tipo } : {}) })

describe('detectarRecords', () => {
  it('sin historial previo no hay récords', () => {
    expect(detectarRecords([s(1, 100, 5)], [])).toEqual([])
  })
  it('peso máximo y 1RM al subir peso', () => {
    const r = detectarRecords([s(1, 105, 5)], [s(1, 100, 5)])
    expect(r.map((x) => x.tipo)).toEqual(['peso', '1rm'])
    expect(r[0]).toMatchObject({ valor: 105, anterior: 100 })
  })
  it('más reps con un peso ya usado', () => {
    const r = detectarRecords([s(1, 100, 7)], [s(1, 100, 5), s(1, 60, 12)])
    expect(r.find((x) => x.tipo === 'reps')).toEqual({ exerciseId: 1, tipo: 'reps', valor: 7, anterior: 5, peso: 100 })
  })
  it('un peso nuevo más bajo no es récord de reps', () => {
    expect(detectarRecords([s(1, 50, 20)], [s(1, 100, 5)]).filter((x) => x.tipo === 'reps')).toEqual([])
  })
  it('ignora calentamientos (de la sesión y del historial) y series vacías', () => {
    expect(detectarRecords([s(1, 200, 10, 'calentamiento'), s(1, 0, 10), s(1, 90, 0)], [s(1, 100, 5)])).toEqual([])
    expect(detectarRecords([s(1, 100, 5)], [s(1, 300, 5, 'calentamiento'), s(1, 90, 5)]).map((x) => x.tipo)).toContain('peso')
  })
  it('un ejercicio por separado de otro', () => {
    expect(detectarRecords([s(2, 500, 5)], [s(1, 100, 5)])).toEqual([])
  })
})

import { describirRecord, recordsDeEntreno } from './records'

describe('recordsDeEntreno', () => {
  const workouts = [{ id: 1, inicio: 100 }, { id: 2, inicio: 200 }, { id: 3, inicio: 300 }]
  const sets = [{ workoutId: 1, ...s(1, 100, 5) }, { workoutId: 2, ...s(1, 110, 5) }, { workoutId: 3, ...s(1, 120, 5) }]
  it('compara solo con los entrenos anteriores a ese', () => {
    expect(recordsDeEntreno(2, workouts, sets).find((r) => r.tipo === 'peso')).toMatchObject({ valor: 110, anterior: 100 })
    expect(recordsDeEntreno(1, workouts, sets)).toEqual([])
    expect(recordsDeEntreno(99, workouts, sets)).toEqual([])
  })
  it('describe cada tipo', () => {
    const f = (n: number) => String(n)
    expect(describirRecord({ exerciseId: 1, tipo: 'peso', valor: 110, anterior: 100 }, f)).toBe('Peso máximo: 110 kg (antes 100)')
    expect(describirRecord({ exerciseId: 1, tipo: 'reps', valor: 7, anterior: 5, peso: 100 }, f)).toBe('7 reps con 100 kg (antes 5)')
  })
})
