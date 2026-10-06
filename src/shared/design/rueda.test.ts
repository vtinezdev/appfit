import { describe, expect, it } from 'vitest'
import { DIAMETRO_DIANA, ELEVACION, OPCIONES_POR_RUEDA, ORBITA_320, paginasRueda, posicionesRueda } from './rueda'

describe('geometría y ampliación de la rueda', () => {
  it('conserva orden y opciones sin comprimir controles al añadir destinos', () => {
    const opciones = Array.from({ length: 11 }, (_, i) => `destino-${i}`)
    const paginas = paginasRueda(opciones)
    expect(paginas.map((p) => p.length)).toEqual([6, 5])
    expect(paginas.flat()).toEqual(opciones)
    expect(paginas.every((p) => p.length <= OPCIONES_POR_RUEDA)).toBe(true)
    expect(opciones).toHaveLength(11)
  })
  it('sin destinos no crea páginas ni puntos', () => {
    expect(paginasRueda([])).toEqual([])
    expect(posicionesRueda(0)).toEqual([])
  })
  it.each([1, 2, 3, 4, 5, 6])('%s dianas circulares no se tocan (centros a diámetro + 8 px) a 320 px, dentro de márgenes y sobre el botón Menú', (cantidad) => {
    const origenX = 160, origenY = 500
    const puntos = posicionesRueda(cantidad).map(p => ({ x: origenX + p.x * ORBITA_320, y: origenY + p.y * ELEVACION }))
    const r = DIAMETRO_DIANA / 2
    for (const p of puntos) {
      expect(p.x - r).toBeGreaterThanOrEqual(14)
      expect(p.x + r).toBeLessThanOrEqual(320 - 14)
      expect(p.y + r).toBeLessThan(origenY - 24) // el botón Menú mide 48 px de alto
    }
    puntos.forEach((p, i) => puntos.slice(i + 1).forEach(q => {
      expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThanOrEqual(DIAMETRO_DIANA + 8)
    }))
  })
  it('seis destinos forman dos filas de tres, la de arriba primero', () => {
    const p = posicionesRueda(6)
    expect(p.slice(0, 3).every(q => q.y === p[0].y)).toBe(true)
    expect(p.slice(3).every(q => q.y === p[3].y)).toBe(true)
    expect(p[0].y).toBeLessThan(p[3].y)
    expect(p.map(q => q.x).slice(0, 3)).toEqual([-1, 0, 1])
  })
  it.each([1, 2, 3, 4, 5, 6])('%s opciones tienen puntos distintos, finitos y dentro de la órbita', (cantidad) => {
    const puntos = posicionesRueda(cantidad)
    expect(puntos).toHaveLength(cantidad)
    expect(new Set(puntos.map((p) => JSON.stringify(p))).size).toBe(cantidad)
    for (const p of puntos) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true)
      expect(Math.abs(p.x)).toBeLessThanOrEqual(1)
      expect(Math.abs(p.y)).toBeLessThanOrEqual(1.4)
      expect(p.y).toBeLessThan(0)
    }
  })
  it.each([-1, 1.5, 7, NaN, Infinity])('no dispone una cantidad inválida %s', (cantidad) => {
    expect(posicionesRueda(cantidad)).toEqual([])
  })
})
