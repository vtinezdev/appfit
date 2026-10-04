import { describe, expect, it } from 'vitest'
import { OPCIONES_POR_RUEDA, paginasRueda, posicionesRueda } from './rueda'

describe('geometría y ampliación de la rueda', () => {
  it('conserva orden y opciones sin comprimir controles al añadir destinos', () => {
    const opciones = Array.from({ length: 11 }, (_, i) => `destino-${i}`)
    const paginas = paginasRueda(opciones)
    expect(paginas.map((p) => p.length)).toEqual([5, 5, 1])
    expect(paginas.flat()).toEqual(opciones)
    expect(paginas.every((p) => p.length <= OPCIONES_POR_RUEDA)).toBe(true)
    expect(opciones).toHaveLength(11)
  })
  it('sin destinos no crea páginas ni puntos', () => {
    expect(paginasRueda([])).toEqual([])
    expect(posicionesRueda(0)).toEqual([])
  })
  it.each([4, 5])('%s destinos quedan sobre el origen, sin colisiones incluso a 320 px', (cantidad) => {
    const puntos = posicionesRueda(cantidad).map(p => ({ x: 160 + p.x * 104, y: 500 + p.y * 160 }))
    for (const p of puntos) {
      expect(p.x - 42).toBeGreaterThanOrEqual(14)
      expect(p.x + 42).toBeLessThanOrEqual(306)
      expect(p.y + 34).toBeLessThan(476)
    }
    puntos.forEach((p, i) => puntos.slice(i + 1).forEach(q => {
      expect(Math.abs(p.x - q.x) >= 84 || Math.abs(p.y - q.y) >= 68).toBe(true)
    }))
  })
  it.each([1, 2, 3, 4, 5])('%s opciones tienen puntos distintos, finitos y dentro de la órbita', (cantidad) => {
    const puntos = posicionesRueda(cantidad)
    expect(puntos).toHaveLength(cantidad)
    expect(new Set(puntos.map((p) => JSON.stringify(p))).size).toBe(cantidad)
    for (const p of puntos) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true)
      expect(Math.abs(p.x)).toBeLessThanOrEqual(1)
      expect(Math.abs(p.y)).toBeLessThanOrEqual(1.05)
      expect(p.y).toBeLessThan(0)
    }
  })
  it.each([-1, 1.5, 6, NaN, Infinity])('no dispone una cantidad inválida %s', (cantidad) => {
    expect(posicionesRueda(cantidad)).toEqual([])
  })
})
