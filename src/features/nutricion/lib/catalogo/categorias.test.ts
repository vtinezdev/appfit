import { describe, expect, it } from 'vitest'
import { CATEGORIAS_ALIMENTO, categoriaDeOff, esCategoriaAlimento, sinPrefijoIdioma } from './categorias'

describe('CATEGORIAS_ALIMENTO', () => {
  it('29 categorías sin repetir, con «Otros» al final', () => {
    expect(CATEGORIAS_ALIMENTO).toHaveLength(29)
    expect(new Set(CATEGORIAS_ALIMENTO).size).toBe(CATEGORIAS_ALIMENTO.length)
    expect(CATEGORIAS_ALIMENTO.at(-1)).toBe('Otros')
  })
  it('esCategoriaAlimento solo acepta las de la lista, tal cual', () => {
    expect(esCategoriaAlimento('Carnes')).toBe(true)
    expect(esCategoriaAlimento('carnes')).toBe(false)
    expect(esCategoriaAlimento('')).toBe(false)
    expect(esCategoriaAlimento(undefined)).toBe(false)
  })
  it('sinPrefijoIdioma', () => {
    expect(sinPrefijoIdioma('en:milks')).toBe('milks')
    expect(sinPrefijoIdioma('es:leches')).toBe('leches')
    expect(sinPrefijoIdioma('milks')).toBe('milks')
  })
})

describe('categoriaDeOff', () => {
  it('por etiquetas, con prioridad ordenada', () => {
    expect(categoriaDeOff(['dairies', 'fermented-milk-products', 'cheeses'], '')).toBe('Quesos') // antes que «yogures»
    expect(categoriaDeOff(['plant-based-milks', 'milks'], '')).toBe('Bebidas vegetales') // antes que «leche»
    expect(categoriaDeOff(['seafood', 'fishes', 'canned-tunas'], '')).toBe('Pescados')
    expect(categoriaDeOff(['cold-cuts', 'meats'], '')).toBe('Embutidos y fiambres')
    expect(categoriaDeOff(['beers', 'alcoholic-beverages', 'beverages'], '')).toBe('Bebidas alcohólicas')
    expect(categoriaDeOff(['plant-based-foods', 'sodas'], '')).toBe('Bebidas')
  })
  it('sin etiquetas útiles usa pnns_groups_2 y después el nombre; si nada, «Otros»', () => {
    expect(categoriaDeOff(['es:algo-raro'], 'Cheese')).toBe('Quesos')
    expect(categoriaDeOff([], 'unknown', 'Mayonesa light')).toBe('Salsas y condimentos')
    expect(categoriaDeOff([], 'unknown', 'Choco duo')).toBe('Otros')
  })
  it('siempre devuelve una categoría de la lista AppFit', () => {
    for (const t of ['yogurts', 'breads', 'olive-oils', 'pastas', 'ice-creams', 'legumes', 'eggs', 'sauces', 'unknown']) {
      expect(CATEGORIAS_ALIMENTO).toContain(categoriaDeOff([t], ''))
    }
  })
})
