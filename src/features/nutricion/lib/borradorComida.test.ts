import { describe, expect, it } from 'vitest'
import { itemSinCoincidencia } from './alimentos'
import { revisionModificada } from './borradorComida'

const inicial = { ...itemSinCoincidencia('Arroz', 100), kcal100: 130, prot100: 3, carb100: 28, grasa100: 0, nutrientes: { fibra: 1, sal: 0.1 } }
describe('cambios pendientes de una entrada', () => {
  it('no pide descarte por alias o metadatos que llegan de una lectura', () => {
    expect(revisionModificada({ ...inicial, nombreCorto: 'Mi arroz', nutrientes: { sal: 0.1, fibra: 1 } }, inicial)).toBe(false)
  })
  it.each([{ gramos: 150 }, { nombre: 'Arroz cocido' }, { kcal100: 140 }, { nutrientes: { fibra: 2, sal: 0.1 } }, { nombreCortoModificado: true }])('protege una edición: %j', cambio => {
    expect(revisionModificada({ ...inicial, ...cambio }, inicial)).toBe(true)
  })
  it('deja de pedir descarte si se revierte la cantidad al valor original', () => {
    const editada = { ...inicial, gramos: 200 }
    expect(revisionModificada({ ...editada, gramos: inicial.gramos }, inicial)).toBe(false)
  })
})
