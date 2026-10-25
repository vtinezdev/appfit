import { describe, expect, it } from 'vitest'
import { energiaDeReferencia, referenciasNutrientes } from './referenciasNutrientes'

describe('referencias diarias sin confundir límites ni azúcares libres', () => {
  it('fibra es un mínimo; azúcares totales solo una referencia de etiquetado', () => {
    expect(referenciasNutrientes(2000)).toMatchObject({
      fibra: { tipo: 'minimo', gramos: 25 }, azucares: { tipo: 'referencia', gramos: 90 }, sal: { tipo: 'limite', gramos: 5 },
    })
  })
  it('saturadas usa 10% de energía y 9 kcal por gramo; azúcares totales no se convierten en libres', () => {
    expect(referenciasNutrientes(2200).agSat.gramos).toBeCloseTo(220 / 9)
    expect(referenciasNutrientes(2200).azucares).toEqual(referenciasNutrientes(2000).azucares)
  })
  it.each([0, -100, NaN, Infinity])('energía no utilizable (%s) conserva una referencia de 2000 kcal', kcal => {
    expect(energiaDeReferencia(kcal)).toBe(2000)
    expect(referenciasNutrientes(kcal).agSat.gramos).toBeCloseTo(200 / 9)
  })
})
