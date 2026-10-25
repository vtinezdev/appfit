import { describe, expect, it } from 'vitest'
import { kcalDeMacros } from '../../nutricion/lib/objetivos'
import { ajusteProteina, aplicarProteinaPorKg, gramosProteina, reajustarConProteinaFija, validarProteinaPorKg } from './proteina'

const base = { kcal: 2200, prot: 150, carb: 238, grasa: 72 }

describe('validarProteinaPorKg', () => {
  it('acepta 1,6–2,2 y redondea a 0,1', () => {
    expect(validarProteinaPorKg(1.8)).toBe(1.8)
    expect(validarProteinaPorKg(1.64)).toBe(1.6)
    expect(validarProteinaPorKg(2.2)).toBe(2.2)
  })
  it.each([1.5, 2.3, NaN, Infinity])('rechaza %s', (v) => expect(validarProteinaPorKg(v)).toBeNull())
})

describe('ajusteProteina', () => {
  it('está activa por defecto con 1,8 g/kg y necesita peso', () => {
    expect(ajusteProteina(undefined, 80)).toEqual({ gPorKg: 1.8, pesoKg: 80 })
    expect(ajusteProteina(undefined, undefined)).toBeNull()
  })
  it('solo `false` la desactiva; usa el valor guardado si es válido', () => {
    expect(ajusteProteina({ proteinaPorKgActiva: false }, 80)).toBeNull()
    expect(ajusteProteina({ proteinaPorKgActiva: true, proteinaPorKg: 2 }, 80)).toEqual({ gPorKg: 2, pesoKg: 80 })
    expect(ajusteProteina({ proteinaPorKg: 5 }, 80)?.gPorKg).toBe(1.8)
  })
})

describe('aplicarProteinaPorKg', () => {
  it('P = g/kg × peso y el resto de kcal se reparte entre C y G con su reparto actual', () => {
    const { objetivos, aplicada } = aplicarProteinaPorKg(base, { gPorKg: 1.8, pesoKg: 80 })
    expect(aplicada).toBe(true)
    expect(objetivos.prot).toBe(144)
    expect(objetivos.kcal).toBe(2200)
    expect(Math.abs(kcalDeMacros(objetivos) - 2200)).toBeLessThanOrEqual(5)
    // el reparto C:G se conserva (≈ 952 : 648 kcal)
    expect(objetivos.carb * 4 / (objetivos.grasa * 9)).toBeCloseTo((238 * 4) / (72 * 9), 1)
  })
  it('sin ajuste no cambia nada', () => {
    expect(aplicarProteinaPorKg(base, null)).toEqual({ objetivos: base, aplicada: false })
  })
  it('si la proteína no cabe en las kcal, no se aplica', () => {
    expect(aplicarProteinaPorKg({ ...base, kcal: 400 }, { gPorKg: 2, pesoKg: 100 }).aplicada).toBe(false)
  })
  it('sin reparto previo de C y G, mitad y mitad de kcal', () => {
    const { objetivos } = aplicarProteinaPorKg({ kcal: 2000, prot: 0, carb: 0, grasa: 0 }, { gPorKg: 2, pesoKg: 75 })
    expect(objetivos.prot).toBe(150)
    expect(Math.abs(kcalDeMacros(objetivos) - 2000)).toBeLessThanOrEqual(5)
  })
  it('gramosProteina redondea', () => {
    expect(gramosProteina({ gPorKg: 1.8, pesoKg: 72.4 })).toBe(130)
  })
})

describe('reajustarConProteinaFija', () => {
  it('cambiar hidratos ajusta solo la grasa y deja la proteína', () => {
    const r = reajustarConProteinaFija(base, 'carb', 200)
    expect(r.prot).toBe(150)
    expect(r.carb).toBe(200)
    expect(Math.abs(kcalDeMacros(r) - 2200)).toBeLessThanOrEqual(5)
  })
  it('cambiar grasa ajusta solo hidratos', () => {
    const r = reajustarConProteinaFija(base, 'grasa', 90)
    expect(r.prot).toBe(150)
    expect(r.grasa).toBe(90)
    expect(Math.abs(kcalDeMacros(r) - 2200)).toBeLessThanOrEqual(5)
  })
  it('cambiar kcal mantiene la proteína y el reparto C:G', () => {
    const r = reajustarConProteinaFija(base, 'kcal', 2500)
    expect(r.kcal).toBe(2500)
    expect(r.prot).toBe(150)
    expect(Math.abs(kcalDeMacros(r) - 2500)).toBeLessThanOrEqual(5)
  })
  it('un macro no puede pasar de las kcal que quedan', () => {
    const r = reajustarConProteinaFija(base, 'carb', 9999)
    expect(r.grasa).toBe(0)
    expect(kcalDeMacros(r)).toBeLessThanOrEqual(2200 + 5)
  })
})
