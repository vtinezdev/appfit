// Receta elegida al añadir comida (propia o del catálogo) y sus variantes. Lógica pura.
// La receta normal es la receta: sus ingredientes del lote y sus pasos, escritos para esas cantidades. Una variante
// cambia ingredientes o cantidades sin tocar la normal; se registra como un plato con sus ingredientes escalados.
import { claveRef, refDe, type FoodRef } from '../../../shared/db/foodRef'
import type { CatalogFood, MealItem, Receta, VarianteReceta } from '../../../shared/db/types'
import { formatNumber, round1 } from '../../../shared/lib/format'
import { normalizeName } from '../../../shared/lib/text'
import type { Por100 } from './alimentos'
import { macrosPorGramos } from './nutrition'
import { pesoCrudoTotal, por100DeReceta, racionesDe } from './recetas'

/** Una receta tal como se enseña y se registra al añadir comida, venga de tus recetas o del catálogo. */
export interface RecetaVista {
  origen: 'tuya' | 'appfit'
  /** Alimento que se registra con la versión normal (el `Food` de la receta propia o el plato del catálogo). */
  ref: FoodRef
  /** Base de sus variantes: la receta propia o el plato del catálogo. */
  base: BaseVariante
  nombre: string
  /** Ingredientes del lote entero, con su aporte. */
  ingredientes: MealItem[]
  pesoCocinadoG: number
  /** Sin raciones (platos del catálogo aún sin preparación escrita) se habla de gramos, no de raciones. */
  raciones?: number
  tiempoMin?: number
  pasos?: string[]
  notas?: string
}

export type BaseVariante = { recetaId: number } | { catalogId: string }

export function vistaDeRecetaPropia(r: Receta): RecetaVista {
  return {
    origen: 'tuya', ref: { tipo: 'user', id: r.foodId }, base: { recetaId: r.id }, nombre: r.nombre,
    ingredientes: r.ingredientes, pesoCocinadoG: r.pesoCocinadoG, raciones: racionesDe(r),
    ...(r.tiempoMin ? { tiempoMin: r.tiempoMin } : {}), ...(r.pasos?.length ? { pasos: r.pasos } : {}), ...(r.notas ? { notas: r.notas } : {}),
  }
}

/**
 * Receta de un plato del catálogo con sus ingredientes resueltos (CIQUAL). `null` si no es una receta o falta
 * algún ingrediente en el catálogo instalado (no se enseña una receta incompleta).
 */
export function vistaDeRecetaCatalogo(f: CatalogFood, ingredientes: ReadonlyMap<string, CatalogFood>): RecetaVista | null {
  const r = f.receta
  if (!r) return null
  const items: MealItem[] = []
  for (const i of r.ingredientes) {
    const ing = ingredientes.get(i.catalogId)
    if (!ing) return null
    const aporte = macrosPorGramos(ing, i.gramos)
    items.push({ catalogId: ing.id, nombre: ing.nombre, gramos: i.gramos, kcal: aporte.kcal, prot: aporte.prot, carb: aporte.carb, grasa: aporte.grasa, ...(aporte.nutrientes ? { nutrientes: aporte.nutrientes } : {}) })
  }
  return {
    origen: 'appfit', ref: { tipo: 'catalog', id: f.id }, base: { catalogId: f.id }, nombre: f.nombre,
    ingredientes: items, pesoCocinadoG: r.pesoFinalG,
    ...(r.raciones ? { raciones: r.raciones } : {}), ...(r.tiempoMin ? { tiempoMin: r.tiempoMin } : {}),
    ...(r.pasos?.length ? { pasos: r.pasos } : {}), ...(r.notas ? { notas: r.notas } : {}),
  }
}

/** Lo que se elige en la hoja: la normal o una variante guardada. */
export type Composicion = Pick<RecetaVista, 'ingredientes' | 'pesoCocinadoG'>

/** Gramos cocinados de una ración (la variante usa las raciones de la normal), o `null` sin raciones. */
export function gramosRacion(vista: Pick<RecetaVista, 'raciones'>, c: Pick<Composicion, 'pesoCocinadoG'>): number | null {
  return vista.raciones ? round1(c.pesoCocinadoG / vista.raciones) : null
}

/** Valores por 100 g cocinados de una composición. */
export function por100De(c: Composicion): Por100 {
  return por100DeReceta(c.ingredientes, c.pesoCocinadoG)
}

/** Ingredientes (en crudo) que corresponden a `gramos` cocinados de la composición. */
export function ingredientesPara(c: Composicion, gramos: number): MealItem[] {
  const f = c.pesoCocinadoG > 0 ? gramos / c.pesoCocinadoG : 0
  return c.ingredientes.map((i) => ({ ...i, gramos: round1(i.gramos * f), kcal: round1(i.kcal * f), prot: round1(i.prot * f), carb: round1(i.carb * f), grasa: round1(i.grasa * f), ...(i.nutrientes ? { nutrientes: escalarNutrientes(i.nutrientes, f) } : {}) }))
}

function escalarNutrientes(n: NonNullable<MealItem['nutrientes']>, f: number): NonNullable<MealItem['nutrientes']> {
  return Object.fromEntries(Object.entries(n).map(([k, v]) => [k, typeof v === 'number' ? Math.round(v * f * 1000) / 1000 : v])) as NonNullable<MealItem['nutrientes']>
}

/**
 * Ingredientes de una ración cambiada (los de la revisión) llevados al lote entero: lo que guarda una variante.
 * `gramosCocinados` es la cantidad de receta que se estaba registrando cuando se cambiaron.
 */
export function aLote(base: Composicion, ingredientesRacion: MealItem[], gramosCocinados: number): MealItem[] {
  return ingredientesPara({ ingredientes: ingredientesRacion, pesoCocinadoG: gramosCocinados }, base.pesoCocinadoG)
}

/** Peso cocinado de una variante: el de la normal en proporción a lo que cambia el peso en crudo. */
export function pesoCocinadoVariante(base: Composicion, ingredientes: MealItem[]): number {
  const crudoBase = pesoCrudoTotal(base.ingredientes)
  return crudoBase > 0 ? Math.max(1, Math.round((base.pesoCocinadoG * pesoCrudoTotal(ingredientes)) / crudoBase)) : base.pesoCocinadoG
}

/** Identidad de un ingrediente para comparar composiciones: su referencia o, si no la tiene, su nombre. */
function claveIngrediente(i: MealItem): string {
  const ref = refDe(i)
  return ref ? claveRef(ref) : `nombre:${normalizeName(i.nombre)}`
}

function porClave(ingredientes: MealItem[]): Map<string, MealItem> {
  const m = new Map<string, MealItem>()
  for (const i of ingredientes) {
    const k = claveIngrediente(i)
    const previo = m.get(k)
    m.set(k, previo ? { ...previo, gramos: previo.gramos + i.gramos } : i)
  }
  return m
}

/** Diferencia mínima que cuenta como cambio de cantidad: 1 g o el 2 % (redondeos al escalar). */
const cambia = (a: number, b: number) => Math.abs(a - b) > Math.max(1, 0.02 * Math.max(a, b))

const gramos = (g: number) => `${formatNumber(g, g < 10 ? 1 : 0)} g`

/** Nombre corto de un ingrediente para las diferencias: el nombre CIQUAL hasta la primera coma («Patata, sin piel, cruda» → «Patata»). */
export function nombreCortoIngrediente(nombre: string): string {
  return nombre.split(',')[0].trim()
}

/**
 * En qué se diferencia una composición de la normal, en frases cortas para la ficha y para proponer el nombre:
 * «Sin chorizo», «Con queso (50 g)», «Patata: 400 g en vez de 300 g». Las cantidades son del lote entero.
 */
export function diferencias(normal: MealItem[], variante: MealItem[]): string[] {
  const a = porClave(normal)
  const b = porClave(variante)
  const out: string[] = []
  for (const [k, i] of a) {
    const otro = b.get(k)
    if (!otro) out.push(`Sin ${nombreCortoIngrediente(i.nombre).toLowerCase()}`)
    else if (cambia(i.gramos, otro.gramos)) out.push(`${nombreCortoIngrediente(i.nombre)}: ${gramos(otro.gramos)} en vez de ${gramos(i.gramos)}`)
  }
  for (const [k, i] of b) if (!a.has(k)) out.push(`Con ${nombreCortoIngrediente(i.nombre).toLowerCase()} (${gramos(i.gramos)})`)
  return out
}

/** Nombre que se propone para una variante nueva: sus dos primeras diferencias. */
export function nombrePropuesto(difs: string[]): string {
  if (difs.length === 0) return 'Mi variante'
  const texto = difs.slice(0, 2).join(' · ')
  return texto.length <= 60 ? texto : `${texto.slice(0, 59).trimEnd()}…`
}

/** true si dos composiciones tienen los mismos ingredientes y cantidades (con la tolerancia de `diferencias`). */
export function mismaComposicion(a: MealItem[], b: MealItem[]): boolean {
  return diferencias(a, b).length === 0
}

/** Variante guardada con la misma composición que `ingredientes`, si la hay (para no duplicarla). */
export function varianteIgual(variantes: readonly VarianteReceta[], ingredientes: MealItem[]): VarianteReceta | undefined {
  return variantes.find((v) => mismaComposicion(v.ingredientes, ingredientes))
}

/** Nombre del plato que se registra con una variante o un cambio puntual. */
export function nombrePlatoDe(vista: Pick<RecetaVista, 'nombre'>, variante?: Pick<VarianteReceta, 'nombre'>): string {
  return variante ? `${vista.nombre} · ${variante.nombre}` : vista.nombre
}

export const NOMBRE_VARIANTE_MAX = 60

/**
 * El recetario AppFit para la pantalla Recetas: los que coinciden con la consulta (todas sus palabras, al principio
 * de alguna del nombre), primero los que ya tienen pasos y después por nombre.
 */
export function filtrarRecetario<T extends Pick<CatalogFood, 'nombre' | 'receta'>>(platos: readonly T[], consulta: string): T[] {
  const palabras = normalizeName(consulta).split(/\s+/).filter(Boolean)
  const coincide = (nombre: string) => {
    if (palabras.length === 0) return true
    const delNombre = normalizeName(nombre).split(/[^a-z0-9ñ]+/).filter(Boolean)
    return palabras.every((p) => delNombre.some((w) => w.startsWith(p)))
  }
  const conPasos = (p: T) => (p.receta?.pasos?.length ? 0 : 1)
  return platos.filter((p) => coincide(p.nombre)).sort((a, b) => conPasos(a) - conPasos(b) || a.nombre.localeCompare(b.nombre, 'es'))
}
