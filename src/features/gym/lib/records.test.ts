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
  it('cada variante tiene sus récords: un agarre no pisa a otro, ni unilateral a bilateral', () => {
    const conAgarre = (peso: number, orientacion: 'prono' | 'supino') => ({ ...s(1, peso, 8), agarre: { orientacion } })
    const porLados = (peso: number) => ({ ...s(1, 0, 0), ejecucion: 'lados' as const, lados: { izquierda: { reps: 8, peso }, derecha: { reps: 8, peso } } })
    const tipos = (r: ReturnType<typeof detectarRecords>) => r.map(x => [x.tipo, x.anterior])
    // Supino con menos kg que el prono de antes, pero más que el supino de antes: récord solo frente al supino.
    const supino = detectarRecords([conAgarre(50, 'supino')], [conAgarre(70, 'prono'), conAgarre(45, 'supino')])
    expect(supino.map(x => [x.tipo, x.valor, x.variante])).toEqual([['peso', 50, 'Supino'], ['1rm', 63.3, 'Supino']])
    // Un supino más pesado que todo el prono no compite con el prono; sin supino antes, no hay récord.
    expect(detectarRecords([conAgarre(90, 'supino')], [conAgarre(70, 'prono')])).toEqual([])
    expect(tipos(detectarRecords([conAgarre(75, 'prono')], [conAgarre(90, 'supino'), conAgarre(70, 'prono')]))).toEqual([['peso', 70], ['1rm', 88.7]])
    // Unilateral y bilateral, igual.
    expect(detectarRecords([porLados(30)], [s(1, 60, 8)])).toEqual([])
    expect(tipos(detectarRecords([s(1, 65, 8)], [porLados(40), s(1, 60, 8)]))).toEqual([['peso', 60], ['1rm', 76]])
    expect(tipos(detectarRecords([porLados(32)], [porLados(30), s(1, 60, 8)]))).toEqual([['peso', 30]])
  })
  it('una máquina de otro gimnasio no compite con la del habitual, sino con la de ese gimnasio', () => {
    const fuera = (peso: number, gimnasioId: number) => ({ ...s(1, peso, 5), gimnasioId })
    expect(detectarRecords([fuera(150, 2)], [s(1, 100, 5)])).toEqual([])
    expect(detectarRecords([s(1, 105, 5)], [fuera(150, 2), s(1, 100, 5)]).map(x => x.tipo)).toEqual(['peso', '1rm'])
    expect(detectarRecords([fuera(160, 2)], [fuera(150, 2)])[0]).toMatchObject({ tipo: 'peso', valor: 160, anterior: 150, variante: 'Otro gimnasio' })
    expect(detectarRecords([fuera(160, 3)], [fuera(150, 2)])).toEqual([])
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
  it('señala la serie que marca cada récord', () => {
    const r = recordsDeEntreno(2, workouts, [sets[0], { id: 21, workoutId: 2, ...s(1, 100, 10) }, { id: 22, workoutId: 2, ...s(1, 105, 3) }])
    expect(r.find((x) => x.tipo === 'peso')?.setId).toBe(22)
    expect(r.find((x) => x.tipo === '1rm')?.setId).toBe(21)
  })
  it('describe cada tipo', () => {
    const f = (n: number) => String(n)
    expect(describirRecord({ exerciseId: 1, tipo: 'peso', valor: 110, anterior: 100 }, f)).toBe('Peso máximo: 110 kg (antes 100)')
    expect(describirRecord({ exerciseId: 1, tipo: 'reps', valor: 7, anterior: 5, peso: 100 }, f)).toBe('7 reps con 100 kg (antes 5)')
  })
})
