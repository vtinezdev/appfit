import { describe, expect, it } from 'vitest'
import { saludoPorHora } from './saludo'

const a = (h: number, m = 0) => new Date(2026, 8, 30, h, m)

describe('saludoPorHora', () => {
  it.each([
    [6, 0, 'Buenos días'],
    [13, 59, 'Buenos días'],
    [14, 0, 'Buenas tardes'],
    [20, 59, 'Buenas tardes'],
    [21, 0, 'Buenas noches'],
    [0, 30, 'Buenas noches'],
    [5, 59, 'Buenas noches'],
  ])('%i:%i → %s', (h, m, esperado) => {
    expect(saludoPorHora(a(h, m))).toBe(esperado)
  })
})
