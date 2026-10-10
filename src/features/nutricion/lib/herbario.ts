// Herbario: plantas distintas que se comen, por semana y desde siempre (Vitrina y Resumen). Funciones puras.
// Fuente de la cifra 30 por semana: McDonald y col., 2018, mSystems (American Gut Project).
import type { Entry } from '../../../shared/db/types'
import { startOfWeek } from '../../../shared/lib/dates'
import { normalizeName, singular } from '../../../shared/lib/text'
import type { CategoriaAlimento } from './catalogo/categorias'
import { sugerirNombreCorto } from './nombresCortos'
import { categoriaDeEntrada } from './repartoCategorias'

/** Categorías vegetales que cuentan como planta. Pan, bollería, platos preparados o recetas no se descomponen. */
export const CATEGORIAS_PLANTA: readonly CategoriaAlimento[] = [
  'Frutas', 'Verduras y hortalizas', 'Patatas y tubérculos', 'Legumbres', 'Frutos secos y semillas', 'Cereales, arroz y pasta',
]
const PLANTA = new Set<string>(CATEGORIAS_PLANTA)

/** Plantas distintas en una semana que se proponen como referencia (American Gut Project). */
export const PLANTAS_SEMANA = 30

export interface Planta {
  /** Nombre corto normalizado y en singular: «Tomates cherry» y «tomate» son la misma planta. */
  clave: string
  nombre: string
  /** Primer día en que aparece. */
  primera: string
  /** Días distintos en que aparece. */
  dias: number
}

type EntradaPlanta = Pick<Entry, 'fecha' | 'nombre' | 'foodId' | 'catalogId' | 'rapida'>

/** Clave de comparación: singular aproximado y sin la «e» final tras consonante («tomates» y «tomate» → «tomat»). */
function clavePlanta(nombre: string): string {
  return normalizeName(nombre).split(' ').map((w) => singular(w).replace(/([^aeiou])e$/, '$1')).join(' ')
}

/** La planta de una entrada, o `null` si su alimento no es de una categoría vegetal. */
export function plantaDeEntrada(e: EntradaPlanta, categorias: ReadonlyMap<string, string>): { clave: string; nombre: string } | null {
  const categoria = categoriaDeEntrada(e, categorias)
  if (!categoria || !PLANTA.has(categoria)) return null
  const nombre = sugerirNombreCorto(e.nombre)
  return { clave: clavePlanta(nombre), nombre }
}

/** Plantas distintas de un conjunto de entradas, por orden alfabético. `categorias`: ver `foodsRepo.categoriasDeEntradas`. */
export function plantasDistintas(entries: readonly EntradaPlanta[], categorias: ReadonlyMap<string, string>): Planta[] {
  const plantas = new Map<string, Planta & { fechas: Set<string> }>()
  for (const e of [...entries].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    const p = plantaDeEntrada(e, categorias)
    if (!p) continue
    const actual = plantas.get(p.clave)
    if (actual) actual.fechas.add(e.fecha)
    else plantas.set(p.clave, { ...p, primera: e.fecha, dias: 0, fechas: new Set([e.fecha]) })
  }
  return [...plantas.values()]
    .map(({ fechas, ...p }) => ({ ...p, dias: fechas.size }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

export interface SemanaHerbario {
  lunes: string
  plantas: number
  /** Día en que se llegó a 30 plantas distintas; `null` si no se llegó. */
  treintaEl: string | null
}

/** Plantas distintas de cada semana (lunes-domingo) con alguna, en orden cronológico. */
export function herbarioPorSemana(entries: readonly EntradaPlanta[], categorias: ReadonlyMap<string, string>): SemanaHerbario[] {
  const semanas = new Map<string, { claves: Set<string>; treintaEl: string | null }>()
  for (const e of [...entries].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    const p = plantaDeEntrada(e, categorias)
    if (!p) continue
    const lunes = startOfWeek(e.fecha)
    const s = semanas.get(lunes) ?? { claves: new Set<string>(), treintaEl: null }
    s.claves.add(p.clave)
    if (s.treintaEl === null && s.claves.size >= PLANTAS_SEMANA) s.treintaEl = e.fecha
    semanas.set(lunes, s)
  }
  return [...semanas].map(([lunes, s]) => ({ lunes, plantas: s.claves.size, treintaEl: s.treintaEl })).sort((a, b) => a.lunes.localeCompare(b.lunes))
}
