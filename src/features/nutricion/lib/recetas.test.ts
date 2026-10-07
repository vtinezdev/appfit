import { describe, expect, it } from 'vitest'
import type { MealItem } from '../../../shared/db/types'
import { itemDesdeElegible } from './alimentos'
import { ingredienteDeItem, itemDeIngrediente, pesoCrudoTotal, por100DeReceta, validarReceta } from './recetas'

const arroz: MealItem = { nombre: 'Arroz', gramos: 200, kcal: 700, prot: 14, carb: 156, grasa: 2, nutrientes: { fibra: 2, sal: 0 } }
const pollo: MealItem = { nombre: 'Pollo', gramos: 300, kcal: 330, prot: 69, carb: 0, grasa: 4, nutrientes: { fibra: 0 } }

describe('por100DeReceta', () => {
  it('suma los ingredientes y divide entre el peso cocinado', () => {
    // 1030 kcal en 800 g cocinados = 128,75 por 100 g
    expect(por100DeReceta([arroz, pollo], 800)).toMatchObject({ kcal100: 128.8, prot100: 10.4, carb100: 19.5, grasa100: 0.8 })
  })
  it('el cocinado pesa más (agua) y baja la densidad', () => {
    expect(por100DeReceta([arroz, pollo], 1000).kcal100).toBeLessThan(por100DeReceta([arroz, pollo], 800).kcal100)
  })
  it('un nutriente solo se conoce si lo conocen todos los ingredientes', () => {
    const r = por100DeReceta([arroz, pollo], 500)
    expect(r.nutrientes).toEqual({ fibra: 0.4 })
  })
  it('peso 0 o sin ingredientes: ceros, sin NaN', () => {
    expect(por100DeReceta([arroz], 0)).toEqual({ kcal100: 0, prot100: 0, carb100: 0, grasa100: 0 })
    expect(por100DeReceta([], 100).nutrientes).toBeUndefined()
  })
})

describe('ingredientes', () => {
  it('pesoCrudoTotal suma gramos', () => {
    expect(pesoCrudoTotal([arroz, pollo])).toBe(500)
  })
  it('ida y vuelta item ↔ ingrediente conserva aporte y catálogo', () => {
    const item = itemDesdeElegible({ ref: { tipo: 'catalog', id: 'ciqual:1' }, nombre: 'Lentejas', kcal100: 120, prot100: 9, carb100: 20, grasa100: 0.5 }, 250)
    const m = ingredienteDeItem(item)
    expect(m).toMatchObject({ catalogId: 'ciqual:1', nombre: 'Lentejas', gramos: 250, kcal: 300, prot: 22.5, carb: 50, grasa: 1.3 })
    expect(itemDeIngrediente(m)).toMatchObject({ nombre: 'Lentejas', gramos: 250, kcal100: 120 })
  })
})

describe('validarReceta', () => {
  it('valida nombre, ingredientes y peso', () => {
    expect(validarReceta('Guiso', [arroz], 500)).toBeNull()
    expect(validarReceta(' ', [arroz], 500)).toMatch(/nombre/)
    expect(validarReceta('G', [], 500)).toMatch(/ingrediente/)
    expect(validarReceta('G', [{ ...arroz, gramos: 0 }], 500)).toMatch(/cantidad/)
    expect(validarReceta('G', [arroz], 0)).toMatch(/peso/)
  })
})
