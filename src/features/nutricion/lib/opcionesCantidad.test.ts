import { describe, expect, it } from 'vitest'
import { opcionesCantidad, textoOpcion } from './opcionesCantidad'

describe('opcionesCantidad', () => {
  it('tu ración, tus raciones, una unidad y 100 g, sin repetir gramos', () => {
    const o = opcionesCantidad({ habitual: 150, porciones: [{ nombre: 'rebanada', gramos: 32 }], unidad: 60 })
    expect(o.map((x) => [x.label, x.gramos])).toEqual([['Tu ración', 150], ['1 rebanada', 32], ['1 unidad', 60], ['100 g', 100]])
    expect(opcionesCantidad({ habitual: 100 }).map((x) => x.label)).toEqual(['Tu ración'])
  })

  it('sin datos, solo 100 g (o 100 ml); como mucho cinco', () => {
    expect(opcionesCantidad({ ml: true })).toEqual([{ label: '100 ml', gramos: 100 }])
    const muchas = opcionesCantidad({ porciones: [1, 2, 3, 4, 5, 6].map((g) => ({ nombre: `r${g}`, gramos: g * 10 })) })
    expect(muchas).toHaveLength(5)
  })

  it('en una receta: toda, la mitad y un cuarto del peso cocinado, sin «1 unidad»', () => {
    const o = opcionesCantidad({ habitual: 300, pesoReceta: 1200, unidad: 60 })
    expect(o.map((x) => [x.label, x.gramos])).toEqual([['Tu ración', 300], ['Toda la receta', 1200], ['La mitad', 600], ['100 g', 100]])
    expect(opcionesCantidad({ pesoReceta: 850 }).map((x) => x.gramos)).toEqual([850, 425, 212.5, 100])
  })

  it('texto de cada opción', () => {
    expect(textoOpcion({ label: 'Tu ración', gramos: 152.5 })).toBe('Tu ración · 152,5 g')
    expect(textoOpcion({ label: '100 g', gramos: 100 })).toBe('100 g')
  })
})
