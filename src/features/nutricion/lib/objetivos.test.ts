import { describe, expect, it } from 'vitest'
import { cuadrarObjetivos, kcalDeMacros, objetivosCuadran, reajustarObjetivos, TOLERANCIA_KCAL } from './objetivos'
import type { Objetivos } from '../../../shared/db/types'

// 150·4 + 238·4 + 72·9 = 600 + 952 + 648 = 2200 → 27 % / 43 % / 30 %
const BASE: Objetivos = { kcal: 2200, prot: 150, carb: 238, grasa: 72 }

function cuadra(o: Objetivos) {
  expect(Math.abs(kcalDeMacros(o) - o.kcal)).toBeLessThanOrEqual(2)
  expect(o.prot).toBeGreaterThanOrEqual(0)
  expect(o.carb).toBeGreaterThanOrEqual(0)
  expect(o.grasa).toBeGreaterThanOrEqual(0)
  for (const v of Object.values(o)) expect(Number.isInteger(v)).toBe(true)
}

describe('reajustarObjetivos', () => {
  it('al cambiar kcal escala los macros manteniendo el reparto en %', () => {
    const o = reajustarObjetivos(BASE, 'kcal', 2500)
    cuadra(o)
    expect(o.kcal).toBe(2500)
    expect(o.prot).toBe(170) // 600/2200 · 2500 / 4 = 170,45
    expect(o.grasa).toBe(82) // 648/2200 · 2500 / 9 = 81,8
  })

  it('al cambiar un macro mantiene las kcal y los otros dos se reparten el resto en su proporción', () => {
    const o = reajustarObjetivos(BASE, 'prot', 200)
    cuadra(o)
    expect(o).toMatchObject({ kcal: 2200, prot: 200 })
    // Quedan 1400 kcal para C y G, que estaban 952 : 648
    expect(o.grasa).toBe(Math.round((1400 * 648) / 1600 / 9))
  })

  it('funciona con cualquier macro, también la grasa', () => {
    for (const campo of ['prot', 'carb', 'grasa'] as const) {
      const o = reajustarObjetivos(BASE, campo, 50)
      cuadra(o)
      expect(o[campo]).toBe(50)
      expect(o.kcal).toBe(2200)
    }
  })

  it('un macro no puede pasar de las kcal totales', () => {
    const o = reajustarObjetivos(BASE, 'prot', 900)
    expect(o).toEqual({ kcal: 2200, prot: 550, carb: 0, grasa: 0 })
  })

  it('calcula desde la base: teclear «2», «25», «250», «2500» no pierde el reparto', () => {
    const directo = reajustarObjetivos(BASE, 'kcal', 2500)
    for (const parcial of [2, 25, 250]) reajustarObjetivos(BASE, 'kcal', parcial)
    expect(reajustarObjetivos(BASE, 'kcal', 2500)).toEqual(directo)
  })

  it('sin reparto previo (todo a 0) usa uno inicial razonable', () => {
    const o = reajustarObjetivos({ kcal: 0, prot: 0, carb: 0, grasa: 0 }, 'kcal', 2000)
    cuadra(o)
    expect(o.prot).toBeGreaterThan(0)
    expect(o.carb).toBeGreaterThan(0)
    expect(o.grasa).toBeGreaterThan(0)
  })

  it('si los otros dos estaban a 0, se reparten el resto igualmente', () => {
    const o = reajustarObjetivos({ kcal: 2000, prot: 500, carb: 0, grasa: 0 }, 'prot', 150)
    cuadra(o)
    expect(o.carb).toBeGreaterThan(0)
    expect(o.grasa).toBeGreaterThan(0)
  })

  it('valores negativos o vacíos cuentan como 0', () => {
    expect(reajustarObjetivos(BASE, 'kcal', Number.NaN)).toEqual({ kcal: 0, prot: 0, carb: 0, grasa: 0 })
    expect(reajustarObjetivos(BASE, 'grasa', -10).grasa).toBe(0)
  })
})

describe('objetivosCuadran / cuadrarObjetivos', () => {
  it('detecta objetivos que no cuadran y los cuadra sin tocar las kcal', () => {
    const mal: Objetivos = { kcal: 2500, prot: 100, carb: 100, grasa: 100 } // 1700 kcal de macros
    expect(objetivosCuadran(mal)).toBe(false)
    const bien = cuadrarObjetivos(mal)
    expect(bien.kcal).toBe(2500)
    expect(objetivosCuadran(bien)).toBe(true)
  })

  it('da por buenos los desajustes de redondeo', () => {
    expect(objetivosCuadran({ ...BASE, kcal: BASE.kcal + TOLERANCIA_KCAL })).toBe(true)
    expect(objetivosCuadran({ ...BASE, kcal: BASE.kcal + TOLERANCIA_KCAL + 1 })).toBe(false)
  })
})
