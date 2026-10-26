import { describe, expect, it } from 'vitest'
import { columnasRejilla } from './rejilla'

describe('columnasRejilla', () => {
  it('hasta cuatro secciones, una sola fila', () => {
    expect([1, 2, 3, 4].map(columnasRejilla)).toEqual([1, 2, 3, 4])
  })

  it('con más, dos filas con la de arriba igual o más larga', () => {
    expect(columnasRejilla(5)).toBe(3) // 3 + 2
    expect(columnasRejilla(6)).toBe(3) // 3 + 3
    expect(columnasRejilla(7)).toBe(4) // 4 + 3
    expect(columnasRejilla(8)).toBe(4) // 4 + 4
  })

  it('nunca pasa de cuatro columnas, que caben a 320 px', () => {
    expect(columnasRejilla(9)).toBe(4)
    expect(columnasRejilla(12)).toBe(4)
  })

  it('fuera de rango, una columna', () => {
    expect(columnasRejilla(0)).toBe(1)
    expect(columnasRejilla(2.5)).toBe(1)
  })
})
