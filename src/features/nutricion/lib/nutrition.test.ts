import { describe, expect, it } from 'vitest'
import { aggregateByDate, distribucionPCG, fraseKcal, macrosPorGramos, mediaDiaria, resumenMacros, resumenPeriodo, sumMacros } from './nutrition'
import type { Entry } from '../../../shared/db/types'

describe('resumenMacros', () => {
  it('redondea a entero con el formato de Hoy', () => {
    expect(resumenMacros({ prot: 41.4, carb: 0, grasa: 2.7 })).toBe('P41 C0 G3')
  })

  it('usa separador de millares como el resto de cifras', () => {
    expect(resumenMacros({ prot: 1200, carb: 3, grasa: 0 })).toBe('P1.200 C3 G0')
  })
})

describe('macrosPorGramos', () => {
  it('escala lineal: 100 g ×1, 200 g ×2, 50 g ×0,5', () => {
    const por100 = { kcal100: 200, prot100: 20, carb100: 10, grasa100: 5 }
    expect(macrosPorGramos(por100, 100)).toEqual({ kcal: 200, prot: 20, carb: 10, grasa: 5 })
    expect(macrosPorGramos(por100, 200)).toEqual({ kcal: 400, prot: 40, carb: 20, grasa: 10 })
    expect(macrosPorGramos(por100, 50)).toEqual({ kcal: 100, prot: 10, carb: 5, grasa: 2.5 })
  })

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

  it('los porcentajes suman siempre 100', () => {
    // 1/3 de las kcal cada uno: redondear por separado daría 33 + 33 + 33 = 99
    const tercios = distribucionPCG({ kcal: 1200, prot: 100, carb: 100, grasa: 400 / 9 })
    expect(tercios.prot + tercios.carb + tercios.grasa).toBe(100)
    // 27,27 / 43,27 / 29,45: el punto que falta va al de mayor resto
    expect(distribucionPCG({ kcal: 2200, prot: 150, carb: 238, grasa: 72 })).toEqual({ prot: 27, carb: 43, grasa: 30 })
  })

  it('devuelve ceros si no hay macros', () => {
    expect(distribucionPCG({ kcal: 0, prot: 0, carb: 0, grasa: 0 })).toEqual({ prot: 0, carb: 0, grasa: 0 })
  })
})

describe('fraseKcal', () => {
  it('cuenta lo que queda, lo que sobra o que se está en el objetivo', () => {
    expect(fraseKcal(1888, 2200)).toBe('Quedan 312 kcal')
    expect(fraseKcal(2292, 2200)).toBe('92 kcal sobre el objetivo')
    expect(fraseKcal(2200.3, 2200)).toBe('En el objetivo')
    expect(fraseKcal(12500, 2200)).toBe('10.300 kcal sobre el objetivo')
  })

  it('sin objetivo no hay frase', () => {
    expect(fraseKcal(500, 0)).toBeNull()
  })
})

describe('resumenPeriodo (P1)', () => {
  const mes = Array.from({ length: 30 }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`)

  it('divide solo entre los días registrados, no entre todos los del mes', () => {
    const entries = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05'].map((f) => entry(f, 2000))
    const r = resumenPeriodo(entries, mes, '2026-09-05')
    expect(r.diasRegistrados).toBe(5)
    expect(r.media.kcal).toBe(2000)
    expect(r.porDia).toHaveLength(30)
    expect(r.porDia[10].kcal).toBe(0)
  })

  it('ignora los días posteriores a hoy aunque tengan entradas', () => {
    const r = resumenPeriodo([entry('2026-09-01', 1800), entry('2026-09-20', 5000)], mes, '2026-09-10')
    expect(r.diasRegistrados).toBe(1)
    expect(r.media.kcal).toBe(1800)
  })

  it('sin días registrados devuelve ceros', () => {
    const r = resumenPeriodo([], mes, '2026-09-10')
    expect(r.diasRegistrados).toBe(0)
    expect(r.media).toEqual({ kcal: 0, prot: 0, carb: 0, grasa: 0 })
    expect(r.distribucion).toEqual({ prot: 0, carb: 0, grasa: 0 })
  })
})
