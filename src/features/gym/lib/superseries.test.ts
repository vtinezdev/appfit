import { describe, expect, it } from 'vitest'
import type { SetEntry } from '../../../shared/db/types'
import { bloquesSesion, separar, siguienteEnRonda, sinDescanso, superserieDe, superseriesDe, superseriesValidas, unirConSiguiente } from './superseries'

const serie = (id: number, exerciseId: number): SetEntry => ({ id, workoutId: 1, exerciseId, reps: 8, peso: 50, orden: id, createdAt: id })

describe('superseries guardadas', () => {
  it('lee los pares y descarta lo mal formado', () => {
    expect(superseriesDe({ superseries: [[1, 2], [3, 3], [4], 'x', [5.5, 6]] })).toEqual([[1, 2]])
    expect(superseriesDe({})).toEqual([])
    expect(superseriesDe(undefined)).toEqual([])
  })

  it('solo valen seguidos, en su orden y sin repetir ejercicio', () => {
    expect(superseriesValidas([[1, 2], [3, 4]], [1, 2, 3, 4])).toEqual([[1, 2], [3, 4]])
    expect(superseriesValidas([[1, 2]], [2, 1, 3])).toEqual([])
    expect(superseriesValidas([[1, 3]], [1, 2, 3])).toEqual([])
    expect(superseriesValidas([[1, 2], [2, 3]], [1, 2, 3])).toEqual([[1, 2]])
    expect(superseriesValidas([[1, 2]], [1, 3])).toEqual([])
  })
})

describe('unir y separar', () => {
  it('une con el siguiente si los dos están libres', () => {
    expect(unirConSiguiente([], [1, 2, 3], 1)).toEqual([[1, 2]])
    expect(unirConSiguiente([[1, 2]], [1, 2, 3], 2)).toBeNull()
    expect(unirConSiguiente([[1, 2]], [1, 2, 3], 3)).toBeNull()
    expect(unirConSiguiente([[1, 2]], [1, 2, 3, 4], 3)).toEqual([[1, 2], [3, 4]])
    // Un par que ya no vale (se movió) no estorba y se limpia.
    expect(unirConSiguiente([[1, 2]], [2, 1, 3], 1)).toEqual([[1, 3]])
  })

  it('separa el par de cualquiera de los dos', () => {
    expect(separar([[1, 2], [3, 4]], [1, 2, 3, 4], 2)).toEqual([[3, 4]])
    expect(superserieDe([[1, 2]], 2)).toEqual([1, 2])
    expect(superserieDe([[1, 2]], 3)).toBeUndefined()
  })

  it('agrupa la sesión en bloques', () => {
    expect(bloquesSesion([1, 2, 3, 4, 5], [[2, 3], [5, 9]])).toEqual([[1], [2, 3], [4], [5]])
    expect(bloquesSesion([], [[1, 2]])).toEqual([])
  })
})

describe('la ronda', () => {
  const sets = [serie(1, 10), serie(2, 10), serie(3, 20), serie(4, 20)]
  const pares = [[10, 20]] as const

  it('alterna: del primero al segundo y del segundo al primero mientras queden', () => {
    expect(siguienteEnRonda(pares, sets, [1], 10)).toBe(20)
    expect(siguienteEnRonda(pares, sets, [1, 3], 20)).toBe(10)
    expect(siguienteEnRonda(pares, sets, [1, 2, 3], 10)).toBe(20)
    expect(siguienteEnRonda(pares, sets, [1, 2, 3, 4], 20)).toBeNull()
    expect(siguienteEnRonda(pares, sets, [1], 30)).toBeNull()
  })

  it('los calentamientos no entran en la ronda', () => {
    const conCalentamiento = [{ ...serie(9, 20), tipo: 'calentamiento' as const }, serie(1, 10), serie(3, 20)]
    expect(siguienteEnRonda(pares, conCalentamiento, [1, 3], 10)).toBeNull()
    expect(sinDescanso(pares, conCalentamiento, [1, 3], 10)).toBe(false)
  })

  it('el descanso llega al terminar la ronda', () => {
    expect(sinDescanso(pares, sets, [1], 10)).toBe(true)
    expect(sinDescanso(pares, sets, [1, 3], 20)).toBe(false)
    // Si al segundo ya no le quedan series, el primero descansa como siempre.
    expect(sinDescanso(pares, sets, [1, 3, 4], 10)).toBe(false)
    expect(sinDescanso([], sets, [1], 10)).toBe(false)
  })
})
