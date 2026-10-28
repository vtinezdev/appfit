import { describe, expect, it } from 'vitest'
import { pistaHitos } from './hitos'

const HITOS = (fechas: (string | null)[]) => [4, 12, 26, 52].map((semanas, i) => ({ semanas, fecha: fechas[i] ?? null }))

describe('pistaHitos', () => {
  it('sin semanas cumplidas: el primero es el siguiente y nada está lleno', () => {
    const { tramos, siguiente } = pistaHitos(HITOS([]), 0)
    expect(tramos.map((t) => t.estado)).toEqual(['siguiente', 'pendiente', 'pendiente', 'pendiente'])
    expect(tramos.every((t) => t.relleno === 0)).toBe(true)
    expect(siguiente).toEqual({ semanas: 4, faltan: 4 })
  })

  it('a medio camino: los logrados llenos y el siguiente con su parte desde el anterior', () => {
    const { tramos, siguiente } = pistaHitos(HITOS(['2026-02-01']), 8)
    expect(tramos.map((t) => t.estado)).toEqual(['logrado', 'siguiente', 'pendiente', 'pendiente'])
    expect(tramos.map((t) => t.relleno)).toEqual([1, 0.5, 0, 0])
    expect(siguiente).toEqual({ semanas: 12, faltan: 4 })
  })

  it('todos logrados: sin siguiente', () => {
    const { tramos, siguiente } = pistaHitos(HITOS(['a', 'b', 'c', 'd']), 60)
    expect(tramos.every((t) => t.estado === 'logrado' && t.relleno === 1)).toBe(true)
    expect(siguiente).toBeNull()
  })
})
