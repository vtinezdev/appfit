import { describe, expect, it } from 'vitest'
import type { Entry } from '../../../shared/db/types'
import { herbarioPorSemana, plantaDeEntrada, plantasDistintas } from './herbario'

const e = (fecha: string, nombre: string, catalogId: string): Pick<Entry, 'fecha' | 'nombre' | 'catalogId'> => ({ fecha, nombre, catalogId })
const categorias = new Map([
  ['catalog:tomate', 'Verduras y hortalizas'],
  ['catalog:tomates', 'Verduras y hortalizas'],
  ['catalog:lentejas', 'Legumbres'],
  ['catalog:pan', 'Pan y tostadas'],
  ['catalog:pollo', 'Carnes'],
])

describe('herbario', () => {
  it('cuenta solo categorías vegetales y une singular y plural', () => {
    expect(plantaDeEntrada(e('2026-10-05', 'Pan de molde', 'pan'), categorias)).toBeNull()
    expect(plantaDeEntrada({ fecha: '2026-10-05', nombre: 'Comida fuera', rapida: true }, categorias)).toBeNull()
    const plantas = plantasDistintas([
      e('2026-10-06', 'Tomates cherry', 'tomates'), e('2026-10-05', 'Tomate', 'tomate'),
      e('2026-10-07', 'Lentejas cocidas', 'lentejas'), e('2026-10-07', 'Pechuga de pollo', 'pollo'),
    ], categorias)
    expect(plantas.map((p) => [p.nombre, p.primera, p.dias])).toEqual([['Lentejas', '2026-10-07', 1], ['Tomate', '2026-10-05', 2]])
  })

  it('por semana, con el día en que se llega a 30', () => {
    const muchas = new Map(Array.from({ length: 30 }, (_, i) => [`catalog:p${i}`, 'Frutas']))
    const entries = Array.from({ length: 30 }, (_, i) => e(i < 15 ? '2026-10-05' : '2026-10-08', `Fruta${i}`, `p${i}`))
    expect(herbarioPorSemana([...entries, e('2026-10-12', 'Fruta', 'p0')], muchas)).toEqual([
      { lunes: '2026-10-05', plantas: 30, treintaEl: '2026-10-08' },
      { lunes: '2026-10-12', plantas: 1, treintaEl: null },
    ])
  })
})
