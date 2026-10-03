import { describe, expect, it } from 'vitest'
import { OPCIONES_POR_RUEDA, paginasRueda, posicionesRueda } from './rueda'

describe('geometría y ampliación de la rueda', () => {
  it('conserva orden y opciones sin comprimir controles al añadir destinos', () => {
    const opciones = Array.from({ length: 11 }, (_, i) => `destino-${i}`)
    const paginas = paginasRueda(opciones)
    expect(paginas.map((p) => p.length)).toEqual([4, 4, 3])
    expect(paginas.flat()).toEqual(opciones)
    expect(paginas.every((p) => p.length <= OPCIONES_POR_RUEDA)).toBe(true)
    expect(opciones).toHaveLength(11)
  })
  it('sin destinos no crea páginas ni puntos', () => {
    expect(paginasRueda([])).toEqual([])
    expect(posicionesRueda(0)).toEqual([])
  })
  it('los cuatro puntos siguen el orden arriba, derecha, abajo, izquierda', () => {
    expect(posicionesRueda(4)).toEqual([{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }])
  })
  it.each([1, 2, 3, 4])('%s opciones tienen puntos distintos, finitos y dentro de la órbita', (cantidad) => {
    const puntos = posicionesRueda(cantidad)
    expect(puntos).toHaveLength(cantidad)
    expect(new Set(puntos.map((p) => JSON.stringify(p))).size).toBe(cantidad)
    for (const p of puntos) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true)
      expect(Math.abs(p.x)).toBeLessThanOrEqual(1)
      expect(Math.abs(p.y)).toBeLessThanOrEqual(1)
    }
  })
  it.each([-1, 1.5, 5, NaN, Infinity])('no dispone una cantidad inválida %s', (cantidad) => {
    expect(posicionesRueda(cantidad)).toEqual([])
  })
})
