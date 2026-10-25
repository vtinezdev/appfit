import { describe, expect, it } from 'vitest'
import type { SetEntry } from '../../../shared/db/types'
import { cargaInusual } from './cargaInusual'
const s: SetEntry = { id: 1, workoutId: 1, exerciseId: 1, reps: 10, peso: 72.5, orden: 0, createdAt: 1, realizada: true }
describe('aviso orientativo de carga', () => {
  it('detecta un posible cero o separador equivocado sin limitar el peso', () => {
    expect(cargaInusual(s, 725, [s])).toBe(72.5)
    expect(cargaInusual(s, 7.25, [s])).toBe(72.5)
    expect(cargaInusual(s, 75, [s])).toBeNull()
  })
  it('exige historial comparable y no confunde asistencia, calentamientos ni técnicas', () => {
    for (const previa of [{ ...s, realizada: false }, { ...s, exerciseId: 2 }, { ...s, modoCarga: 'asistencia' as const }, { ...s, tipo: 'calentamiento' as const }, { ...s, ejecucion: 'unilateral' as const }]) expect(cargaInusual(s, 725, [previa])).toBeNull()
    expect(cargaInusual(s, 725, [])).toBeNull()
    expect(cargaInusual({ ...s, ejecucion: 'lados' }, 725, [s])).toBeNull()
  })
  it('no molesta con cargas cero, no finitas o cambios absolutos pequeños', () => {
    for (const valor of [0, NaN, Infinity, -4]) expect(cargaInusual(s, valor, [s])).toBeNull()
    expect(cargaInusual(s, 3, [{ ...s, peso: 1 }])).toBeNull()
  })
})
