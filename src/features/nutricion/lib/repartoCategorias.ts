// Categorías en Alimentos (filtro y revisión de los que no tienen) y en Resumen (reparto). Funciones puras.
import { claveRef, refDe } from '../../../shared/db/foodRef'
import type { Entry, Food } from '../../../shared/db/types'
import { CATEGORIAS_ALIMENTO, esCategoriaAlimento, type CategoriaAlimento } from './catalogo/categorias'

/** Filtro de la lista de Alimentos: todas, solo las que faltan por clasificar o una categoría. */
export type FiltroCategoria = 'todas' | 'sin' | CategoriaAlimento

/** Alimentos que aún no tienen una categoría válida (anteriores a las categorías o importados). */
export function sinCategoria(foods: Food[]): Food[] {
  return foods.filter((f) => !esCategoriaAlimento(f.categoria))
}

export function filtrarPorCategoria(foods: Food[], filtro: FiltroCategoria): Food[] {
  if (filtro === 'todas') return foods
  if (filtro === 'sin') return sinCategoria(foods)
  return foods.filter((f) => f.categoria === filtro)
}

/** Categorías que tienen algún alimento, en el orden de la lista, con cuántos hay de cada una. */
export function categoriasPresentes(foods: Food[]): { categoria: CategoriaAlimento; alimentos: number }[] {
  const cuenta = new Map<string, number>()
  for (const f of foods) if (esCategoriaAlimento(f.categoria)) cuenta.set(f.categoria, (cuenta.get(f.categoria) ?? 0) + 1)
  return CATEGORIAS_ALIMENTO.flatMap((categoria) => {
    const alimentos = cuenta.get(categoria)
    return alimentos ? [{ categoria, alimentos }] : []
  })
}

/** Categoría de una entrada según su referencia (ver `foodsRepo.categoriasDeEntradas`); `undefined` si no tiene. */
export function categoriaDeEntrada(e: Pick<Entry, 'foodId' | 'catalogId' | 'rapida'>, categorias: ReadonlyMap<string, string>): string | undefined {
  if (e.rapida) return undefined
  try {
    const ref = refDe(e)
    return ref ? categorias.get(claveRef(ref)) : undefined
  } catch {
    return undefined
  }
}

export interface RepartoCategoria {
  /** `null`: kcal rápidas, alimentos borrados y alimentos sin categoría. */
  categoria: string | null
  kcal: number
  prot: number
  /** Parte de las kcal del periodo (0–1). */
  fraccion: number
}

/**
 * Kcal y proteína del periodo por categoría, de más a menos kcal; lo que no tiene categoría va al final.
 * Sin kcal en el periodo, vacío.
 */
export function repartoPorCategoria(entries: Entry[], categorias: ReadonlyMap<string, string>): RepartoCategoria[] {
  const grupos = new Map<string | null, { kcal: number; prot: number }>()
  let total = 0
  for (const e of entries) {
    const clave = categoriaDeEntrada(e, categorias) ?? null
    const g = grupos.get(clave) ?? { kcal: 0, prot: 0 }
    g.kcal += e.kcal
    g.prot += e.prot
    grupos.set(clave, g)
    total += e.kcal
  }
  if (total <= 0) return []
  return [...grupos.entries()]
    .map(([categoria, g]) => ({ categoria, ...g, fraccion: g.kcal / total }))
    .filter((r) => r.kcal > 0 || r.prot > 0)
    .sort((a, b) => Number(a.categoria === null) - Number(b.categoria === null) || b.kcal - a.kcal)
}
