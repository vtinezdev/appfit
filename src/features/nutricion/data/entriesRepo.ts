// Acceso a la tabla `entries` (lo que se ha comido). Las entradas guardan un snapshot de los macros,
// así que cambiar o borrar un alimento después no altera lo ya registrado.
import { db } from '../../../shared/db/db'
import type { Comida, Entry } from '../../../shared/db/types'
import type { ItemGuardado, KcalRapidasDraft, Por100 } from '../lib/alimentos'
import { macrosPorGramos } from '../lib/nutrition'
import { planCopia, type DestinoCopia } from '../lib/plantillas'
import * as foodsRepo from './foodsRepo'

export function delDia(fecha: string): Promise<Entry[]> {
  return db.entries.where('fecha').equals(fecha).toArray()
}

/** Entradas entre dos fechas YYYY-MM-DD, ambas incluidas. */
export function entreFechas(desde: string, hasta: string): Promise<Entry[]> {
  return db.entries.where('fecha').between(desde, hasta, true, true).toArray()
}

export interface GuardarComidaInput {
  fecha: string
  comida: Comida
  items: ItemGuardado[]
  textoOriginal?: string
}

/**
 * Guarda los alimentos revisados como entradas nuevas (creando o actualizando sus alimentos).
 * Todo o nada: si falla un alimento, no se guarda ninguno.
 */
export function guardarComida({ fecha, comida, items, textoOriginal }: GuardarComidaInput): Promise<number[]> {
  return db.transaction('rw', db.foods, db.entries, async () => {
    const ids: number[] = []
    for (const item of items) {
      const foodId = await foodsRepo.resolverParaGuardar(item)
      ids.push(
        await db.entries.add({
          fecha,
          comida,
          foodId,
          nombre: item.nombre,
          gramos: item.gramos,
          ...macrosPorGramos(item, item.gramos),
          textoOriginal,
          createdAt: Date.now(),
        }),
      )
    }
    return ids
  })
}

export interface EditarInput extends Por100 {
  comida: Comida
  nombre: string
  gramos: number
  /** Si es true, los valores y el nombre se aplican también al alimento guardado de la entrada. */
  aplicarAlAlimento: boolean
}

/**
 * Edita una entrada. Por defecto solo cambia esa entrada (su snapshot); el alimento guardado
 * solo se corrige si se pide expresamente con `aplicarAlAlimento`.
 */
export function editar(id: number, { comida, nombre, gramos, aplicarAlAlimento, ...valores }: EditarInput): Promise<void> {
  return db.transaction('rw', db.foods, db.entries, async () => {
    const entry = await db.entries.get(id)
    if (!entry) return
    if (aplicarAlAlimento && entry.foodId !== undefined && (await db.foods.get(entry.foodId))) {
      await foodsRepo.actualizar(entry.foodId, { nombre, ...valores, fuente: 'manual' })
    }
    await db.entries.update(id, { comida, nombre, gramos, ...macrosPorGramos(valores, gramos) })
  })
}

export interface AnadirDesdeAlimentoInput {
  fecha: string
  comida: Comida
  foodId: number
  gramos: number
}

/**
 * Añadido rápido: entrada a partir de un alimento guardado, con sus valores actuales.
 * No toca el alimento: los frecuentes se calculan a partir de las entradas.
 */
export async function anadirDesdeAlimento({ fecha, comida, foodId, gramos }: AnadirDesdeAlimentoInput): Promise<number | undefined> {
  const food = await db.foods.get(foodId)
  if (!food) return undefined
  return db.entries.add({
    fecha,
    comida,
    foodId: food.id,
    nombre: food.nombre,
    gramos,
    ...macrosPorGramos(food, gramos),
    createdAt: Date.now(),
  })
}

export interface AnadirDesdeCatalogoInput {
  fecha: string
  comida: Comida
  catalogId: string
  gramos: number
}

/**
 * Añadido rápido desde el catálogo: entrada con `catalogId` y el snapshot de sus valores actuales, sin crear
 * ningún alimento en «Alimentos». Devuelve `undefined` si ese alimento ya no está en el catálogo.
 */
export async function anadirDesdeCatalogo({ fecha, comida, catalogId, gramos }: AnadirDesdeCatalogoInput): Promise<number | undefined> {
  const food = await db.catalogFoods.get(catalogId)
  if (!food) return undefined
  return db.entries.add({
    fecha,
    comida,
    catalogId: food.id,
    nombre: food.nombre,
    gramos,
    ...macrosPorGramos(food, gramos),
    createdAt: Date.now(),
  })
}

export interface AnadirRapidaInput extends KcalRapidasDraft {
  fecha: string
  comida: Comida
}

/** «Kcal rápidas» (A5): entrada sin alimento (gramos = 0, sin foodId), p. ej. una comida fuera. */
export function anadirRapida({ fecha, comida, nombre, kcal, prot, carb, grasa }: AnadirRapidaInput): Promise<number> {
  return db.entries.add({ fecha, comida, nombre, gramos: 0, kcal, prot, carb, grasa, rapida: true, createdAt: Date.now() })
}

/** Edita una entrada rápida (no toca `fecha`/`comida`: el sheet de edición no las expone). */
export async function editarRapida(id: number, datos: KcalRapidasDraft): Promise<void> {
  await db.entries.update(id, datos)
}

/** Borra la entrada y la devuelve, para poder deshacer con `restaurar`. */
export function borrar(id: number): Promise<Entry | undefined> {
  return db.transaction('rw', db.entries, async () => {
    const entry = await db.entries.get(id)
    if (entry) await db.entries.delete(id)
    return entry
  })
}

/** Vuelve a guardar entradas borradas con sus mismos ids. */
export async function restaurar(entries: Entry[]): Promise<void> {
  await db.entries.bulkPut(entries)
}

export interface CopiarInput {
  origen: DestinoCopia
  destino: DestinoCopia
}

/**
 * Copia el snapshot de las entradas del origen al destino (A2): «Copiar a otro día» (con `comida`)
 * o «Copiar el día a…» (sin `comida`, conserva la de cada entrada). Todo o nada.
 */
export function copiar({ origen, destino }: CopiarInput): Promise<number[]> {
  return db.transaction('rw', db.entries, async () => {
    const deLaFecha = await db.entries.where('fecha').equals(origen.fecha).toArray()
    const entradas = origen.comida ? deLaFecha.filter((e) => e.comida === origen.comida) : deLaFecha
    if (entradas.length === 0) return []
    return db.entries.bulkAdd(planCopia(entradas, destino, Date.now()), { allKeys: true })
  })
}

/** Borra varias entradas y las devuelve, para poder deshacer con `restaurar` (copias y plantillas). */
export function borrarVarias(ids: number[]): Promise<Entry[]> {
  return db.transaction('rw', db.entries, async () => {
    const entradas = (await db.entries.bulkGet(ids)).filter((e): e is Entry => e !== undefined)
    await db.entries.bulkDelete(ids)
    return entradas
  })
}
