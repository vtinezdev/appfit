import { describe, expect, it } from 'vitest'
import { aggregateByDate, distribucionPCG, macrosPorGramos, mediaDiaria, sumMacros } from './nutrition'
import type { Entry } from '../db'

describe('macrosPorGramos', () => {
  it('escala los valores por 100 g a los gramos indicados', () => {
    const macros = macrosPorGramos({ kcal100: 200, prot100: 20, carb100: 10, grasa100: 5 }, 150)
    expect(macros).toEqual({ kcal: 300, prot: 30, carb: 15, grasa: 7.5 })
  })

  it('devuelve 0 con 0 gramos', () => {
    const macros = macrosPorGramos({ kcal100: 200, prot100: 20, carb100: 10, grasa100: 5 }, 0)
    expect(macros).toEqual({ kcal: 0, prot: 0, carb: 0, grasa: 0 })
  })
})

describe('sumMacros', () => {
  it('suma varias entradas de macros', () => {
    const total = sumMacros([
      { kcal: 100, prot: 10, carb: 5, grasa: 2 },
      { kcal: 200, prot: 20, carb: 10, grasa: 4 },
    ])
    expect(total).toEqual({ kcal: 300, prot: 30, carb: 15, grasa: 6 })
  })
})

function entry(fecha: string, kcal: number): Entry {
  return { id: 0, fecha, comida: 'comida', nombre: 'x', gramos: 100, kcal, prot: 0, carb: 0, grasa: 0, createdAt: 0 }
}

describe('aggregateByDate', () => {
  it('agrupa por fecha respetando el límite lunes-domingo de otras funciones de dates.ts', () => {
    const map = aggregateByDate([entry('2024-01-01', 500), entry('2024-01-01', 300), entry('2024-01-02', 400)])
    expect(map.get('2024-01-01')?.kcal).toBe(800)
    expect(map.get('2024-01-02')?.kcal).toBe(400)
    expect(map.has('2024-01-03')).toBe(false)
  })
})

describe('mediaDiaria', () => {
  it('calcula la media de una lista de macros', () => {
    const media = mediaDiaria([
      { kcal: 100, prot: 10, carb: 10, grasa: 10 },
      { kcal: 300, prot: 30, carb: 30, grasa: 30 },
    ])
    expect(media).toEqual({ kcal: 200, prot: 20, carb: 20, grasa: 20 })
  })

  it('no falla con lista vacía', () => {
    expect(mediaDiaria([])).toEqual({ kcal: 0, prot: 0, carb: 0, grasa: 0 })
  })
})

describe('distribucionPCG', () => {
  it('calcula el porcentaje de kcal por macro', () => {
    // 100g prot = 400 kcal, 100g carb = 400 kcal, 0g grasa = 0 kcal -> 50/50/0
    const dist = distribucionPCG({ kcal: 800, prot: 100, carb: 100, grasa: 0 })
    expect(dist).toEqual({ prot: 50, carb: 50, grasa: 0 })
  })

  it('devuelve ceros si no hay macros', () => {
    expect(distribucionPCG({ kcal: 0, prot: 0, carb: 0, grasa: 0 })).toEqual({ prot: 0, carb: 0, grasa: 0 })
  })
})
