import { describe, expect, it } from 'vitest'
import type { Entry, Food } from '../../../shared/db/types'
import { categoriaDeEntrada, categoriasPresentes, filtrarPorCategoria, repartoPorCategoria, sinCategoria } from './repartoCategorias'

function food(id: number, nombre: string, categoria?: string): Food {
  return { id, nombre, nombreNorm: nombre.toLowerCase(), kcal100: 100, prot100: 1, carb100: 1, grasa100: 1, fuente: 'manual', updatedAt: 0, ...(categoria ? { categoria } : {}) }
}

function entry(id: number, kcal: number, prot: number, ref: Partial<Pick<Entry, 'foodId' | 'catalogId' | 'rapida'>>): Entry {
  return { id, fecha: '2026-10-08', comida: 'comida', nombre: `e${id}`, gramos: 100, kcal, prot, carb: 0, grasa: 0, createdAt: id, ...ref }
}

const FOODS = [food(1, 'Pollo', 'Carnes'), food(2, 'Ternera', 'Carnes'), food(3, 'Manzana', 'Frutas'), food(4, 'Antiguo'), food(5, 'Raro', 'No existe')]

describe('Alimentos por categoría', () => {
  it('sin categoría: los que no tienen una válida', () => {
    expect(sinCategoria(FOODS).map((f) => f.id)).toEqual([4, 5])
  })
  it('filtrar: todas, sin categoría o una categoría', () => {
    expect(filtrarPorCategoria(FOODS, 'todas')).toHaveLength(5)
    expect(filtrarPorCategoria(FOODS, 'sin').map((f) => f.id)).toEqual([4, 5])
    expect(filtrarPorCategoria(FOODS, 'Carnes').map((f) => f.id)).toEqual([1, 2])
    expect(filtrarPorCategoria(FOODS, 'Pescados')).toEqual([])
  })
  it('categorías presentes en el orden de la lista, con su recuento', () => {
    expect(categoriasPresentes(FOODS)).toEqual([{ categoria: 'Frutas', alimentos: 1 }, { categoria: 'Carnes', alimentos: 2 }])
  })
})

describe('repartoPorCategoria', () => {
  const categorias = new Map([['user:1', 'Carnes'], ['catalog:ciqual:1', 'Frutas']])

  it('categoría de una entrada por su referencia; las rápidas y las desconocidas no tienen', () => {
    expect(categoriaDeEntrada({ foodId: 1 }, categorias)).toBe('Carnes')
    expect(categoriaDeEntrada({ catalogId: 'ciqual:1' }, categorias)).toBe('Frutas')
    expect(categoriaDeEntrada({ foodId: 9 }, categorias)).toBeUndefined()
    expect(categoriaDeEntrada({ rapida: true }, categorias)).toBeUndefined()
    expect(categoriaDeEntrada({ foodId: 1, catalogId: 'ciqual:1' }, categorias)).toBeUndefined()
  })

  it('suma kcal y proteína por categoría, de más a menos kcal, con «sin categoría» al final', () => {
    const entries = [
      entry(1, 300, 30, { foodId: 1 }),
      entry(2, 100, 10, { foodId: 1 }),
      entry(3, 100, 0, { catalogId: 'ciqual:1' }),
      entry(4, 500, 5, { rapida: true }),
      entry(5, 0, 0, { foodId: 9 }),
    ]
    expect(repartoPorCategoria(entries, categorias)).toEqual([
      { categoria: 'Carnes', kcal: 400, prot: 40, fraccion: 0.4 },
      { categoria: 'Frutas', kcal: 100, prot: 0, fraccion: 0.1 },
      { categoria: null, kcal: 500, prot: 5, fraccion: 0.5 },
    ])
  })

  it('sin kcal en el periodo, vacío', () => {
    expect(repartoPorCategoria([], categorias)).toEqual([])
    expect(repartoPorCategoria([entry(1, 0, 0, { foodId: 1 })], categorias)).toEqual([])
  })
})
