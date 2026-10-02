import { describe, expect, it } from 'vitest'
import { parsearParte } from './parsear'
import { GRAMOS_SIN_DATO, gramosDeParte, racionDe } from './raciones'

function gramos(texto: string) {
  const parte = parsearParte(texto)!
  return gramosDeParte(parte, racionDe(parte.consulta))
}

describe('racionDe', () => {
  it('encuentra la ración por la consulta, en singular o con la raíz aproximada', () => {
    expect(racionDe('huevo')?.gramos).toBe(60)
    expect(racionDe('tomat')?.gramos).toBe(120) // «tomates» → «tomat»
    expect(racionDe('pechuga pollo')?.gramos).toBe(150)
  })

  it('con varias palabras, si no está entera, vale el peso de la primera', () => {
    expect(racionDe('huevo duro')).toEqual({ gramos: 60, medidas: undefined })
    expect(racionDe('yogur griego')).toEqual({ gramos: 125 })
  })

  it('sin dato, undefined', () => {
    expect(racionDe('lenteja')).toBeUndefined()
    expect(racionDe('')).toBeUndefined()
  })
})

describe('gramosDeParte', () => {
  it.each([
    ['200 g de arroz', 200],
    ['1,5 kg de patatas', 1500],
    ['medio litro de leche', 500],
    ['33 cl de cerveza', 330],
    ['2 huevos', 120],
    ['un plátano', 120],
    ['medio aguacate', 75],
    ['un vaso de leche', 200],
    ['2 cucharadas de aceite', 30],
    ['2 rebanadas de pan', 60],
    ['una lata de atún', 60],
    ['una lata de cerveza', 330],
    ['una lata de maíz', 80],
    ['3 lonchas de jamón', 45],
    ['2 lonchas de queso', 40],
    ['plátano', 120],
    ['10 almendras', 12],
  ])('%s → %i g', (texto, esperado) => {
    expect(gramos(texto)).toEqual({ gramos: esperado, estimados: false })
  })

  it('sin cantidad ni peso por unidad: 100 g estimados', () => {
    expect(gramos('arroz')).toEqual({ gramos: GRAMOS_SIN_DATO, estimados: true })
    expect(gramos('2 lentejas')).toEqual({ gramos: 2 * GRAMOS_SIN_DATO, estimados: true })
  })

  it('redondea y nunca devuelve menos de 1 g', () => {
    expect(gramosDeParte({ cantidad: 0.1 }, { gramos: 1.2 })).toEqual({ gramos: 1, estimados: false })
  })
})
