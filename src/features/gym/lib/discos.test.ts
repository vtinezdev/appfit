import { describe, expect, it } from 'vitest'
import { calcularDiscos } from './discos'

describe('calcularDiscos', () => {
  it('100 kg con barra de 20: 25 + 15 por lado', () => {
    const r = calcularDiscos(100)
    expect(r.porLado).toEqual([{ disco: 25, cantidad: 1 }, { disco: 15, cantidad: 1 }])
    expect(r).toMatchObject({ alcanzable: 100, exacto: true })
  })
  it('usa varios discos iguales y los pequeños', () => {
    // (142,5 - 20) / 2 = 61,25 = 25 + 25 + 10 + 1,25
    expect(calcularDiscos(142.5).porLado).toEqual([{ disco: 25, cantidad: 2 }, { disco: 10, cantidad: 1 }, { disco: 1.25, cantidad: 1 }])
  })
  it('solo la barra no lleva discos', () => {
    expect(calcularDiscos(20)).toMatchObject({ porLado: [], exacto: true, alcanzable: 20, menorQueBarra: false })
  })
  it('menor que la barra', () => {
    expect(calcularDiscos(15)).toMatchObject({ menorQueBarra: true, alcanzable: 20, exacto: false })
  })
  it('peso no exacto: indica el alcanzable más cercano', () => {
    const r = calcularDiscos(61)
    expect(r.exacto).toBe(false)
    expect(r.alcanzable).toBe(60)
    expect(calcularDiscos(61.5).alcanzable).toBe(62.5)
  })
  it('barras de 15 y 10 kg', () => {
    expect(calcularDiscos(35, 15).porLado).toEqual([{ disco: 10, cantidad: 1 }])
    expect(calcularDiscos(30, 10).porLado).toEqual([{ disco: 10, cantidad: 1 }])
  })
})
