import { describe, expect, it } from 'vitest'
import { resumenRutina } from './rutinas'
import { cuandoFue } from './workout'

describe('resumenRutina', () => {
  const ejercicios = new Map([1, 2, 3, 4, 5, 6].map(id => [id, { catalogId: id === 3 ? undefined : `appfit:e${id}` }]))
  it('mosaico de cuatro, «+N», series objetivo y último entreno terminado', () => {
    const r = { id: 7, exerciseIds: [1, 2, 3, 4, 5, 6, 99], objetivos: { 1: { series: 3, repsMin: 8, repsMax: 10 }, 5: { series: 4, repsMin: 6, repsMax: 8 } } }
    const workouts = [{ routineId: 7, inicio: 100, fin: 200 }, { routineId: 7, inicio: 500, fin: 600 }, { routineId: 7, inicio: 900 }, { routineId: 8, inicio: 1000, fin: 1100 }]
    expect(resumenRutina(r, workouts, ejercicios)).toEqual({ miniaturas: ['appfit:e1', 'appfit:e2', undefined, 'appfit:e4'], resto: 2, series: 7, ultima: 500 })
  })
  it('sin objetivos ni entrenos', () => {
    expect(resumenRutina({ id: 1, exerciseIds: [1] }, [], ejercicios)).toEqual({ miniaturas: ['appfit:e1'], resto: 0, series: null, ultima: null })
  })
})

describe('cuandoFue', () => {
  it('días naturales: hoy, ayer, hace n días y fecha desde una semana', () => {
    const ahora = new Date(2026, 9, 9, 10)
    expect(cuandoFue(new Date(2026, 9, 9, 8).getTime(), ahora)).toBe('Hoy')
    expect(cuandoFue(new Date(2026, 9, 8, 23).getTime(), ahora)).toBe('Ayer')
    expect(cuandoFue(new Date(2026, 9, 4).getTime(), ahora)).toBe('Hace 5 días')
    expect(cuandoFue(new Date(2026, 9, 2).getTime(), ahora)).toBe('2 oct')
  })
})
