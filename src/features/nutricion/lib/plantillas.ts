import type { Comida, Entry, Food, Meal, MealItem } from '../../../shared/db/types'
import type { Por100 } from './alimentos'
import { macrosPorGramos } from './nutrition'
import { camposPlato, clavePlato, renovarPlatos } from './platos'
import { camposNutrientes, escalarNutrientes } from './nutrientes'

export interface DestinoCopia {
  fecha: string
  /** Si no se especifica, cada entrada conserva su propia comida (copiar el día entero). */
  comida?: Comida
}

/**
 * true si copiar de `origen` a `destino` no cambiaría nada (A2): mismo día y, si `origen.comida`
 * está fijado (copiar una comida concreta), también la misma comida. Un toque accidental sobre
 * «Copiar» con el destino igual al origen no debe duplicar en silencio el contenido.
 */
export function copiaEsNoOp(origen: DestinoCopia, destino: DestinoCopia): boolean {
  if (origen.fecha !== destino.fecha) return false
  return origen.comida === undefined || origen.comida === destino.comida
}

/**
 * Prepara las entradas a insertar para copiar `entries` a `destino` (A2): mismo snapshot
 * (alimento, macros, «rápida»…), `createdAt` nuevo y sin id (lo asigna Dexie al insertar).
 */
export function planCopia(entries: Entry[], destino: DestinoCopia, ahora: number, loteId: string): Omit<Entry, 'id'>[] {
  return renovarPlatos(entries, loteId, clavePlato).map((e) => ({
    fecha: destino.fecha,
    comida: destino.comida ?? e.comida,
    foodId: e.foodId,
    catalogId: e.catalogId,
    nombre: e.nombre,
    gramos: e.gramos,
    kcal: e.kcal,
    prot: e.prot,
    carb: e.carb,
    grasa: e.grasa,
    ...camposNutrientes(e.nutrientes),
    textoOriginal: e.textoOriginal,
    createdAt: ahora,
    rapida: e.rapida,
    ...camposPlato(e),
  }))
}

/** Snapshot de una entrada para guardarla en una plantilla (A1): mismos valores, sin fecha/id/textoOriginal. */
export function itemsDesdeEntradas(entries: Entry[]): MealItem[] {
  return entries.map((e) => ({
    foodId: e.foodId,
    catalogId: e.catalogId,
    nombre: e.nombre,
    gramos: e.gramos,
    kcal: e.kcal,
    prot: e.prot,
    carb: e.carb,
    grasa: e.grasa,
    ...camposNutrientes(e.nutrientes),
    rapida: e.rapida,
    ...camposPlato(e),
  }))
}

/**
 * Recalcula un ítem al cambiar sus gramos, escalando siempre desde `por100` (fijado una vez al
 * empezar a editar, no recalculado del propio ítem): pasar por 0 g o por redondeos intermedios
 * nunca corrompe los valores por 100 g originales.
 */
export function itemConGramos(item: MealItem, por100: Por100, gramos: number): MealItem {
  return { ...item, gramos, ...macrosPorGramos(por100, gramos), nutrientes: escalarNutrientes(por100.nutrientes, gramos / 100) }
}

/** true si todos los ítems no «rápidos» tienen gramos válidos (> 0), listos para guardar. */
export function itemsConGramosValidos(items: MealItem[]): boolean {
  return items.every((it) => it.rapida || it.gramos > 0)
}

/**
 * Resuelve los ítems de una plantilla: si el alimento todavía existe, usa sus valores **actuales**
 * escalados a los gramos guardados; si no (se borró, o el ítem es una «rápida» sin alimento), usa el
 * snapshot guardado en la plantilla. `foodsById` va indexado por `Food['id']`.
 */
export function resolverItemsPlantilla(items: MealItem[], foodsById: Map<number, Food>): MealItem[] {
  return items.map((item) => {
    const food = item.foodId !== undefined ? foodsById.get(item.foodId) : undefined
    if (!food) return { ...item, ...camposNutrientes(item.nutrientes) }
    return { foodId: food.id, nombre: food.nombre, gramos: item.gramos, ...macrosPorGramos(food, item.gramos), ...camposPlato(item) }
  })
}

export interface DestinoPlantilla {
  fecha: string
  comida: Comida
}

/**
 * Prepara las entradas a insertar al aplicar una plantilla (A1): resuelve cada ítem (ver
 * `resolverItemsPlantilla`) y les da la fecha/comida de destino, `createdAt` nuevo y sin id.
 */
export function entradasDesdePlantilla(meal: Meal, foodsById: Map<number, Food>, destino: DestinoPlantilla, ahora: number, loteId: string): Omit<Entry, 'id'>[] {
  return renovarPlatos(resolverItemsPlantilla(meal.items, foodsById), loteId).map((item) => ({
    fecha: destino.fecha,
    comida: destino.comida,
    foodId: item.foodId,
    catalogId: item.catalogId,
    nombre: item.nombre,
    gramos: item.gramos,
    kcal: item.kcal,
    prot: item.prot,
    carb: item.carb,
    grasa: item.grasa,
    ...camposNutrientes(item.nutrientes),
    createdAt: ahora,
    rapida: item.rapida,
    ...camposPlato(item),
  }))
}
