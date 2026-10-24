import { describe, expect, it } from 'vitest'
import { encajanConLoQueFalta, faltaDelDia, type AlimentoElegible } from './alimentos'

const alimento = (id: number, nombre: string, kcal100: number, prot100: number): AlimentoElegible =>
  ({ ref: { tipo: 'user', id }, nombre, kcal100, prot100, carb100: 0, grasa100: 0 })

const yogur = alimento(1, 'Yogur griego 0 %', 57, 10)
const pechuga = alimento(2, 'Pechuga de pollo', 110, 23)
const queso = alimento(3, 'Queso curado', 400, 25)
const manzana = alimento(4, 'Manzana', 52, 0)

describe('«Cerrar el día» (B10)', () => {
  it('propone la cantidad que cubre la proteína sin pasar de las kcal, por proteína por kcal', () => {
    const r = encajanConLoQueFalta([queso, yogur, pechuga, manzana], { prot: 32, kcal: 540 })
    expect(r.map((e) => e.alimento.nombre)).toEqual(['Pechuga de pollo', 'Yogur griego 0 %', 'Queso curado'])
    expect(r[0]).toMatchObject({ gramos: 135, prot: 31.1, kcal: 149 })
    // El yogur cubriría 32 g con 320 g (182 kcal).
    expect(r[1]).toMatchObject({ gramos: 320, prot: 32 })
    // El queso se queda en lo que dejan las kcal: 540 kcal son 135 g.
    expect(r[2]).toMatchObject({ gramos: 125, kcal: 500 })
    for (const e of r) expect(e.kcal).toBeLessThanOrEqual(540)
  })

  it('con pocas kcal, la cantidad la marcan las kcal', () => {
    const [e] = encajanConLoQueFalta([pechuga], { prot: 40, kcal: 100 })
    expect(e).toMatchObject({ gramos: 90, kcal: 99 })
  })

  it('nada si faltan menos de 10 g de proteína, si no quedan kcal o si no cabe ni lo mínimo', () => {
    expect(encajanConLoQueFalta([pechuga], { prot: 8, kcal: 500 })).toEqual([])
    expect(encajanConLoQueFalta([pechuga], { prot: 30, kcal: 0 })).toEqual([])
    expect(encajanConLoQueFalta([queso], { prot: 30, kcal: 20 })).toEqual([])
    expect(encajanConLoQueFalta([manzana], { prot: 30, kcal: 500 })).toEqual([])
  })

  it('como mucho 400 g y cinco propuestas', () => {
    const lechuga = alimento(5, 'Lechuga', 15, 1.4)
    expect(encajanConLoQueFalta([lechuga], { prot: 30, kcal: 900 })[0].gramos).toBe(400)
    const muchos = Array.from({ length: 8 }, (_, i) => alimento(10 + i, `A${i}`, 100, 10 + i))
    expect(encajanConLoQueFalta(muchos, { prot: 30, kcal: 900 })).toHaveLength(5)
  })

  it('lo que falta del día', () => {
    expect(faltaDelDia({ prot: 100, kcal: 1500 }, { prot: 140, kcal: 2200 })).toEqual({ prot: 40, kcal: 700 })
    expect(faltaDelDia({ prot: 160, kcal: 2500 }, { prot: 140, kcal: 2200 })).toEqual({ prot: 0, kcal: 0 })
    expect(faltaDelDia({ prot: 0, kcal: 0 }, null)).toBeNull()
  })
})
