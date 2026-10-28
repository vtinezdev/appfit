import { describe, expect, it } from 'vitest'
import { ordenarElegibles, partesNombre } from './ordenBusqueda'

const a = (id: string, kcal100: number, prot100: number, carb100 = 0, grasa100 = 0) => ({ id, kcal100, prot100, carb100, grasa100 })
const lista = [a('x', 120, 9, 4, 8), a('y', 50, 4, 4, 2), a('z', 103, 9, 4, 8), a('w', 74, 4, 3, 5)]
const ids = (l: { id: string }[]) => l.map((e) => e.id).join('')

describe('ordenarElegibles', () => {
  it('relevancia deja el orden del buscador (y no muta la lista)', () => {
    const r = ordenarElegibles(lista, 'relevancia')
    expect(ids(r)).toBe('xyzw')
    expect(r).not.toBe(lista)
  })

  it('por proteína y por kcal, en los dos sentidos; a igualdad, el orden del buscador', () => {
    expect(ids(ordenarElegibles(lista, 'mas-proteina'))).toBe('xzyw')
    expect(ids(ordenarElegibles(lista, 'menos-proteina'))).toBe('ywxz')
    expect(ids(ordenarElegibles(lista, 'menos-kcal'))).toBe('ywzx')
    expect(ids(ordenarElegibles(lista, 'mas-kcal'))).toBe('xzwy')
  })

  it('menos hidratos y menos grasa', () => {
    expect(ids(ordenarElegibles(lista, 'menos-hidratos'))).toBe('wxyz')
    expect(ids(ordenarElegibles(lista, 'menos-grasa'))).toBe('ywxz')
  })
})

describe('partesNombre', () => {
  it('parte por la primera coma', () => {
    expect(partesNombre('Yogur al estilo griego, aromatizado, azucarado')).toEqual(['Yogur al estilo griego', 'aromatizado, azucarado'])
    expect(partesNombre('Yogur griego')).toEqual(['Yogur griego', ''])
  })
})
