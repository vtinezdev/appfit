import { describe, expect, it } from 'vitest'
import type { Exercise } from '../../../shared/db/types'
import { familiaDe, familiasPresentes, filtrarPorEjercicio } from './listaProgreso'

const ej = (id: number, nombre: string, extra: Partial<Exercise> = {}): Exercise => ({ id, nombre, nombreNorm: nombre.toLowerCase(), grupo: 'General', ...extra })
const ejercicios = new Map([
  [1, ej(1, 'Press banca', { primaryMuscles: ['pecho'] })],
  [2, ej(2, 'Curl con mancuernas', { primaryMuscles: ['biceps'] })],
  [3, ej(3, 'Sentadilla', { catalogId: 'appfit:sentadilla' })],
  [4, ej(4, 'Misterioso')],
])

describe('lista «Por ejercicio» de Progreso', () => {
  it('grupo ancho por el músculo principal, también del catálogo en registros sin metadatos', () => {
    expect(familiaDe(ejercicios.get(2)!)).toBe('brazos')
    expect(familiaDe(ejercicios.get(3)!)).toBe('piernas')
    expect(familiaDe(ejercicios.get(4)!)).toBeNull()
  })
  it('busca por el principio de cada palabra y filtra por grupos, sin cambiar el orden', () => {
    expect(filtrarPorEjercicio([3, 2, 1], ejercicios, 'man', [])).toEqual([2])
    expect(filtrarPorEjercicio([3, 2, 1], ejercicios, '', ['pecho', 'piernas'])).toEqual([3, 1])
    expect(filtrarPorEjercicio([3, 2, 1], ejercicios, 'press', ['brazos'])).toEqual([])
  })
  it('solo ofrece los grupos con ejercicios', () => {
    expect(familiasPresentes([1, 2, 4], ejercicios)).toEqual({ pecho: 'Pecho', brazos: 'Brazos' })
  })
})
