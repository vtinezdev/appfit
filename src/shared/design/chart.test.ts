import { describe, expect, it } from 'vitest'
import { escalaAjustada } from './chart'

describe('escalaAjustada', () => {
  it('se ciñe a los datos con un paso redondo y sin forzar el cero', () => {
    expect(escalaAjustada([63.75, 66.25, 73.75, 81.7, 95])).toEqual({ dominio: [60, 100], marcas: [60, 70, 80, 90, 100] })
  })

  it('funciona con magnitudes grandes (volumen en kg)', () => {
    expect(escalaAjustada([2347.5, 2442.5, 2727.5])).toEqual({ dominio: [2300, 2800], marcas: [2300, 2400, 2500, 2600, 2700, 2800] })
  })

  it('un solo valor tiene margen por encima y por debajo', () => {
    const { dominio } = escalaAjustada([70])
    expect(dominio[0]).toBeLessThanOrEqual(70)
    expect(dominio[1]).toBeGreaterThan(70)
  })

  it('nunca baja de cero', () => {
    expect(escalaAjustada([2, 40]).dominio[0]).toBe(0)
  })

  it('sin datos (o no finitos) devuelve una escala mínima', () => {
    expect(escalaAjustada([])).toEqual({ dominio: [0, 1], marcas: [0, 1] })
    expect(escalaAjustada([Number.NaN])).toEqual({ dominio: [0, 1], marcas: [0, 1] })
    expect(escalaAjustada([0, 0])).toEqual({ dominio: [0, 1], marcas: [0, 1] })
  })
})
