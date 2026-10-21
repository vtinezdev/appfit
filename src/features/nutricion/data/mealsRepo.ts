// Acceso a la tabla `meals` (plantillas de comida, A1).
import { db } from '../../../shared/db/db'
import type { Comida, Entry, Meal, MealItem } from '../../../shared/db/types'
import { camposDeRef, type FoodRef } from '../../../shared/db/foodRef'
import type { ItemGuardado } from '../lib/alimentos'
import { macrosPorGramos } from '../lib/nutrition'
import { entradasDesdePlantilla, itemsDesdeEntradas, type DestinoPlantilla } from '../lib/plantillas'
import * as foodsRepo from './foodsRepo'
import * as nombresAlimentosRepo from './nombresAlimentosRepo'

/** Ordenadas por `usadoAt` descendente: las últimas usadas (o creadas, si no se han usado nunca) primero. */
export function listar(): Promise<Meal[]> {
  return db.meals.orderBy('usadoAt').reverse().toArray()
}

export function obtener(id: number): Promise<Meal | undefined> {
  return db.meals.get(id)
}

export async function borrar(id: number): Promise<void> {
  await db.meals.delete(id)
}

export interface ActualizarMealInput {
  nombre?: string
  items?: MealItem[]
}

/** Renombrar, cambiar los gramos de un ítem o quitar alimentos (gestión en Alimentos). */
export async function actualizar(id: number, datos: ActualizarMealInput): Promise<void> {
  await db.transaction('rw', db.meals, async () => {
    const meal = await db.meals.get(id)
    if (meal) await db.meals.put({ ...meal, ...datos })
  })
}

export interface CrearDesdeEntradasInput {
  nombre: string
  comida?: Comida
  entries: Entry[]
}

/** Guarda una comida ya registrada como plantilla («Marcar como comida típica…» en el «⋯» del diario). */
export function crearDesdeEntradas({ nombre, comida, entries }: CrearDesdeEntradasInput): Promise<number> {
  const ahora = Date.now()
  return db.meals.add({
    nombre: nombre.trim(),
    comida,
    items: itemsDesdeEntradas(entries),
    usos: 0,
    usadoAt: ahora,
    createdAt: ahora,
  })
}

/** Guarda una sugerencia como típica permanente, con sus snapshots y sin escribir en el diario. */
export function crearDesdeItems({ nombre, comida, items }: { nombre: string; comida?: Comida; items: MealItem[] }): Promise<number> {
  if (!nombre.trim() || items.length === 0 || items.some(it => !it.nombre.trim() || (!it.rapida && (!Number.isFinite(it.gramos) || it.gramos <= 0)))) {
    return Promise.reject(new Error('Indica un nombre y añade alimentos con cantidades válidas.'))
  }
  const ahora = Date.now()
  return db.meals.add({ nombre: nombre.trim(), comida, items, usos: 0, usadoAt: ahora, createdAt: ahora })
}

/** Crea una plantilla directamente desde la revisión, sin escribir entradas en el diario. Todo o nada. */
export function crearDesdeRevision({ nombre, comida, items }: { nombre: string; comida: Comida; items: ItemGuardado[] }): Promise<number> {
  if (!nombre.trim() || items.length === 0 || items.some(it => !it.nombre.trim() || !Number.isFinite(it.gramos) || it.gramos <= 0)) {
    return Promise.reject(new Error('Indica un nombre y añade alimentos con cantidades válidas.'))
  }
  const ahora = Date.now()
  const platoId = items.length > 1 ? crypto.randomUUID() : undefined
  return db.transaction('rw', db.meals, db.foods, db.nombresAlimentos, async () => {
    const guardados: MealItem[] = []
    for (const item of items) {
      const ref: FoodRef = item.catalogId !== undefined ? { tipo: 'catalog', id: item.catalogId } : { tipo: 'user', id: await foodsRepo.resolverParaGuardar(item) }
      if (item.nombreCorto !== undefined) await nombresAlimentosRepo.guardarEnTransaccion(ref, item.nombreCorto)
      guardados.push({ ...camposDeRef(ref), nombre: item.nombre, gramos: item.gramos, ...macrosPorGramos(item, item.gramos), ...(platoId ? { platoId, nombrePlato: nombre.trim() } : {}) })
    }
    return db.meals.add({ nombre: nombre.trim(), comida, items: guardados, usos: 0, usadoAt: ahora, createdAt: ahora })
  })
}

/**
 * Aplica una plantilla (A1): recalcula cada ítem con los valores **actuales** del alimento (o el
 * snapshot si se borró o es una «rápida», ver `resolverItemsPlantilla`), e incrementa `usos`/`usadoAt`.
 * Todo o nada. Si la plantilla no existe o no tiene ítems, no hace nada.
 */
export function aplicar(id: number, destino: DestinoPlantilla): Promise<number[]> {
  const loteId = crypto.randomUUID()
  return db.transaction('rw', db.meals, db.foods, db.entries, async () => {
    const meal = await db.meals.get(id)
    if (!meal || meal.items.length === 0) return []
    const foodIds = meal.items.map((it) => it.foodId).filter((fid): fid is number => fid !== undefined)
    const foodsById = await foodsRepo.porIds(foodIds)
    const nuevas = entradasDesdePlantilla(meal, foodsById, destino, Date.now(), loteId)
    const ids = await db.entries.bulkAdd(nuevas, { allKeys: true })
    await db.meals.update(id, { usos: meal.usos + 1, usadoAt: Date.now() })
    return ids
  })
}

/** Usa una combinación sugerida sin convertirla en plantilla ni modificar contadores de comidas guardadas. */
export function aplicarSugerencia(items: MealItem[], destino: DestinoPlantilla): Promise<number[]> {
  const loteId = crypto.randomUUID()
  return db.transaction('rw', db.foods, db.entries, async () => {
    if (items.length === 0) return []
    const foodIds = items.map(it => it.foodId).filter((id): id is number => id !== undefined)
    const foodsById = await foodsRepo.porIds(foodIds)
    return db.entries.bulkAdd(entradasDesdePlantilla({ items }, foodsById, destino, Date.now(), loteId), { allKeys: true })
  })
}
