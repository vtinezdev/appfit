import { describe, expect, it } from 'vitest'
import { anilloEnergia } from './anilloEnergia'

const total = (a: ReturnType<typeof anilloEnergia>) => a.tramos.reduce((s, t) => s + t.largo, 0)

describe('anilloEnergia', () => {
  it('llena el anillo en proporción al objetivo y reparte por las kcal de cada macro', () => {
    // 100 g P (400) + 100 g C (400) + 22,2… g G (200) = 1000 kcal de 2000
    const a = anilloEnergia({ kcal: 1000, prot: 100, carb: 100, grasa: 200 / 9 }, 2000)
    expect(a.tramos.map((t) => t.tipo)).toEqual(['prot', 'carbs', 'fat'])
    expect(a.tramos[0]).toEqual({ tipo: 'prot', inicio: 0, largo: 0.2 })
    expect(a.tramos[1].inicio).toBeCloseTo(0.2)
    expect(a.tramos[1].largo).toBeCloseTo(0.2)
    expect(a.tramos[2].inicio).toBeCloseTo(0.4)
    expect(a.tramos[2].largo).toBeCloseTo(0.1)
    expect(total(a)).toBeCloseTo(0.5)
    expect(a.vuelta).toBe(0)
  })

  it('las kcal sin desglose forman un tramo «otros» al final', () => {
    const a = anilloEnergia({ kcal: 500, prot: 25, carb: 25, grasa: 0 }, 1000) // 200 de macros + 300 sin desglose
    expect(a.tramos.map((t) => [t.tipo, t.largo])).toEqual([['prot', 0.1], ['carbs', 0.1], ['otros', 0.3]])
  })

  it('si los macros suman más kcal que el día (redondeos), se reparte entre ellos sin pasarse', () => {
    const a = anilloEnergia({ kcal: 390, prot: 50, carb: 50, grasa: 0 }, 400) // 400 kcal de macros
    expect(a.tramos.map((t) => t.tipo)).toEqual(['prot', 'carbs'])
    expect(total(a)).toBeCloseTo(390 / 400)
  })

  it('se queda lleno al alcanzar el objetivo y el exceso va a la segunda vuelta', () => {
    expect(anilloEnergia({ kcal: 2000, prot: 0, carb: 500, grasa: 0 }, 2000).vuelta).toBe(0)
    const a = anilloEnergia({ kcal: 2500, prot: 0, carb: 625, grasa: 0 }, 2000)
    expect(total(a)).toBeCloseTo(1)
    expect(a.vuelta).toBeCloseTo(0.25)
  })

  it('la segunda vuelta no pasa de una vuelta completa', () => {
    expect(anilloEnergia({ kcal: 5000, prot: 0, carb: 0, grasa: 0 }, 2000).vuelta).toBe(1)
  })

  it('sin consumo no hay tramos', () => {
    expect(anilloEnergia({ kcal: 0, prot: 0, carb: 0, grasa: 0 }, 2000)).toEqual({ tramos: [], vuelta: 0 })
  })

  it('sin objetivo, el anillo entero muestra el reparto y no hay segunda vuelta', () => {
    const a = anilloEnergia({ kcal: 800, prot: 50, carb: 50, grasa: 0 }, 0)
    expect(total(a)).toBeCloseTo(1)
    expect(a.vuelta).toBe(0)
  })

  it('ignora valores negativos o no finitos', () => {
    expect(anilloEnergia({ kcal: Number.NaN, prot: -5, carb: 0, grasa: 0 }, 2000)).toEqual({ tramos: [], vuelta: 0 })
    expect(anilloEnergia({ kcal: 500, prot: 0, carb: 0, grasa: 0 }, Number.NaN).tramos).toEqual([{ tipo: 'otros', inicio: 0, largo: 1 }])
  })
})
