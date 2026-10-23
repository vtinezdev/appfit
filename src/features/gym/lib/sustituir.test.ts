import { describe, expect, it } from 'vitest'
import { ordenTrasSustituir, textoUltimaVez } from './sustituir'

describe('orden tras sustituir', () => {
  it('ocupa el sitio del anterior o va detrás si este se queda; si ya estaba, se mueve', () => {
    expect(ordenTrasSustituir([1, 2, 3], 2, 9, false)).toEqual([1, 9, 3])
    expect(ordenTrasSustituir([1, 2, 3], 2, 9, true)).toEqual([1, 2, 9, 3])
    expect(ordenTrasSustituir([1, 2, 3], 1, 3, false)).toEqual([3, 2])
    expect(ordenTrasSustituir([1, 3], 2, 9, false)).toEqual([1, 3, 9])
  })
})

describe('última vez de una alternativa', () => {
  const dia = 86400000
  it('series efectivas, reps más repetidas y peso mayor, con cuándo', () => {
    const s = (reps: number, peso: number, extra = {}) => ({ reps, peso, ...extra })
    expect(textoUltimaVez([s(12, 20, { tipo: 'calentamiento' as const }), s(10, 30), s(10, 32), s(8, 32)], 0, 23 * dia)).toBe('3 × 10 · 32 kg, hace 23 días')
    expect(textoUltimaVez([s(10, 32)], 0, dia)).toBe('1 × 10 · 32 kg, ayer')
    expect(textoUltimaVez([s(15, 0, { modoCarga: 'corporal' as const })], 0, 0)).toBe('1 × 15, hoy')
    expect(textoUltimaVez([s(10, 30, { realizada: false })], 0, 0)).toBe('Nunca')
    expect(textoUltimaVez([], undefined, 0)).toBe('Nunca')
  })
})
