import { describe, expect, it } from 'vitest'
import { epley1RM, formatUltimaVez, pesoMaximo, siguienteOrden, valoresNuevaSerie, volumenSets } from './workout'

describe('epley1RM', () => {
  it('con 1 repetición el 1RM es el propio peso', () => {
    expect(epley1RM(100, 1)).toBe(100)
  })

  it('aplica la fórmula de Epley: peso * (1 + reps/30)', () => {
    expect(epley1RM(100, 5)).toBeCloseTo(116.7, 1)
  })

  it('devuelve 0 con reps o peso no positivos', () => {
    expect(epley1RM(0, 5)).toBe(0)
    expect(epley1RM(100, 0)).toBe(0)
  })
})

describe('volumenSets', () => {
  it('suma peso * reps de cada serie', () => {
    expect(
      volumenSets([
        { peso: 100, reps: 5 },
        { peso: 80, reps: 8 },
      ]),
    ).toBe(1140)
  })

  it('devuelve 0 sin series', () => {
    expect(volumenSets([])).toBe(0)
  })
})

describe('pesoMaximo', () => {
  it('devuelve el peso más alto de la lista', () => {
    expect(pesoMaximo([{ peso: 60 }, { peso: 80 }, { peso: 70 }])).toBe(80)
  })

  it('devuelve 0 sin series', () => {
    expect(pesoMaximo([])).toBe(0)
  })
})

describe('formatUltimaVez', () => {
  it('indica que no hay datos previos si no hay series', () => {
    expect(formatUltimaVez([])).toBe('Sin datos previos')
  })

  it('agrupa series repetidas iguales', () => {
    const texto = formatUltimaVez([
      { reps: 8, peso: 60 },
      { reps: 8, peso: 60 },
      { reps: 8, peso: 60 },
    ])
    expect(texto).toBe('3×8 @ 60 kg')
  })
})

describe('valoresNuevaSerie', () => {
  it('repite reps y peso de la serie previa', () => {
    expect(valoresNuevaSerie({ reps: 5, peso: 60 })).toEqual({ reps: 5, peso: 60 })
  })

  it('sin serie previa usa 8 × 20 kg', () => {
    expect(valoresNuevaSerie(undefined)).toEqual({ reps: 8, peso: 20 })
  })
})

describe('siguienteOrden', () => {
  it('empieza en 0', () => {
    expect(siguienteOrden([])).toBe(0)
  })

  it('es uno más que el mayor, aunque falten series intermedias', () => {
    expect(siguienteOrden([{ orden: 0 }, { orden: 2 }])).toBe(3)
  })
})
