import { describe, expect, it } from 'vitest'
import { sanearObjetivo, textoObjetivo } from './objetivos'

describe('objetivos de rutina', () => {
  it('sanea series, reps y descanso', () => {
    expect(sanearObjetivo({ series: 0, repsMin: 12, repsMax: 8 })).toEqual({ series: 1, repsMin: 12, repsMax: 12 })
    expect(sanearObjetivo({ series: 15, repsMin: 0, repsMax: 500, descansoSeg: 5 })).toEqual({ series: 10, repsMin: 1, repsMax: 100, descansoSeg: 15 })
    expect(sanearObjetivo({ series: 3, repsMin: 8, repsMax: 12, descansoSeg: 0 })).toEqual({ series: 3, repsMin: 8, repsMax: 12 })
  })
  it('formatea el objetivo', () => {
    expect(textoObjetivo({ series: 3, repsMin: 8, repsMax: 12 })).toBe('3 × 8–12')
    expect(textoObjetivo({ series: 4, repsMin: 5, repsMax: 5 })).toBe('4 × 5')
  })
})
