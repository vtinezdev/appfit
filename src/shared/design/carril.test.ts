import { describe, expect, it } from 'vitest'
import { tramosCarril } from './carril'

describe('tramosCarril', () => {
  it('por debajo del objetivo: relleno proporcional, sin exceso, meta al final', () => {
    expect(tramosCarril(50, 200)).toEqual({ relleno: 0.25, exceso: 0, meta: 1 })
  })

  it('en el objetivo: relleno completo', () => {
    expect(tramosCarril(200, 200)).toEqual({ relleno: 1, exceso: 0, meta: 1 })
  })

  it('por encima: el dominio crece, el relleno llega a la meta y el resto es exceso', () => {
    const t = tramosCarril(300, 200)
    expect(t.relleno).toBeCloseTo(2 / 3)
    expect(t.exceso).toBeCloseTo(1 / 3)
    expect(t.meta).toBeCloseTo(2 / 3)
  })

  it('sin objetivo: meta null y sin exceso', () => {
    expect(tramosCarril(120, 0)).toEqual({ relleno: 1, exceso: 0, meta: null })
    expect(tramosCarril(0, 0)).toEqual({ relleno: 0, exceso: 0, meta: null })
  })

  it('valores negativos o no finitos cuentan como 0', () => {
    expect(tramosCarril(-5, 100)).toEqual({ relleno: 0, exceso: 0, meta: 1 })
    expect(tramosCarril(Number.NaN, 100)).toEqual({ relleno: 0, exceso: 0, meta: 1 })
  })
})
