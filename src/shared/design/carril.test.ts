import { describe, expect, it } from 'vitest'
import { tramosCarril } from './carril'

describe('tramosCarril', () => {
  it('por debajo del objetivo: relleno proporcional, sin exceso, meta al final y sin marca', () => {
    expect(tramosCarril(50, 200)).toEqual({ relleno: 0.25, exceso: 0, meta: 1, marca: null })
  })

  it('en el objetivo: relleno completo y sin marca (el final del carril ya es el objetivo)', () => {
    expect(tramosCarril(200, 200)).toEqual({ relleno: 1, exceso: 0, meta: 1, marca: null })
  })

  it('por encima: el dominio crece, el relleno llega a la meta, el resto es exceso y la marca aparece en la meta', () => {
    const t = tramosCarril(300, 200)
    expect(t.relleno).toBeCloseTo(2 / 3)
    expect(t.exceso).toBeCloseTo(1 / 3)
    expect(t.meta).toBeCloseTo(2 / 3)
    expect(t.marca).toBeCloseTo(2 / 3)
  })

  it('sin objetivo: meta y marca null, sin exceso', () => {
    expect(tramosCarril(120, 0)).toEqual({ relleno: 1, exceso: 0, meta: null, marca: null })
    expect(tramosCarril(0, 0)).toEqual({ relleno: 0, exceso: 0, meta: null, marca: null })
  })

  it('valores negativos o no finitos cuentan como 0', () => {
    expect(tramosCarril(-5, 100)).toEqual({ relleno: 0, exceso: 0, meta: 1, marca: null })
    expect(tramosCarril(Number.NaN, 100)).toEqual({ relleno: 0, exceso: 0, meta: 1, marca: null })
  })
})
