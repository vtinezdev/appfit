// Acceso a la tabla `foods`. Con entriesRepo, mealsRepo y catalogRepo, es lo único de Nutrición que toca `db.*`.
// Las funciones de lectura no escriben nunca, así que se pueden usar dentro de un useLiveQuery.
import { db } from '../../../shared/db/db'
import type { Comida, Food } from '../../../shared/db/types'
import { addDays } from '../../../shared/lib/dates'
import { normalizeName } from '../../../shared/lib/text'
import {
  decidirGuardado,
  elegibleDeCatalogo,
  elegibleDeFood,
  filtrarAlimentos,
  rankFrecuentes,
  VENTANA_FRECUENTES_DIAS,
  type AlimentoElegible,
  type ItemGuardado,
} from '../lib/alimentos'
import * as catalogRepo from './catalogRepo'

export type FoodInput = Omit<Food, 'id' | 'nombreNorm' | 'updatedAt'>

/** Ya existe otro alimento con el mismo nombre normalizado (el índice `&nombreNorm` es único). */
export class NombreDuplicadoError extends Error {
  constructor(nombre: string) {
    super(`Ya existe un alimento llamado «${nombre}».`)
  }
}

export function listar(): Promise<Food[]> {
  return db.foods.orderBy('nombre').toArray()
}

export function obtener(id: number): Promise<Food | undefined> {
  return db.foods.get(id)
}

/** Los últimos alimentos creados o editados (orden por `updatedAt`). */
export function recientes(n: number): Promise<Food[]> {
  return db.foods.orderBy('updatedAt').reverse().limit(n).toArray()
}

/** Búsqueda sin tildes ni mayúsculas en todos los alimentos (ver `filtrarAlimentos`). */
export async function buscar(q: string, limite = 20): Promise<Food[]> {
  return filtrarAlimentos(await db.foods.toArray(), q, limite)
}

export interface FrecuentesInput {
  comida: Comida
  hoy: string
  dias?: number
  limite?: number
}

/**
 * Los alimentos (propios o del catálogo) más usados en esa comida en los últimos días (ver `rankFrecuentes`),
 * completados con tus alimentos recientes si no hay historial suficiente. Los que ya no existen (alimento
 * borrado, catálogo borrado o actualizado sin ese id) se descartan. Solo lectura: se puede usar en un liveQuery.
 */
export async function frecuentes({ comida, hoy, dias = VENTANA_FRECUENTES_DIAS, limite = 10 }: FrecuentesInput): Promise<AlimentoElegible[]> {
  const entries = await db.entries.where('fecha').between(addDays(hoy, -(dias - 1)), hoy, true, true).toArray()
  const refs = rankFrecuentes(entries, { comida, hoy, dias }).slice(0, limite)
  const idsUsuario = refs.flatMap((r) => (r.tipo === 'user' ? [r.id] : []))
  const idsCatalogo = refs.flatMap((r) => (r.tipo === 'catalog' ? [r.id] : []))
  const [propios, delCatalogo] = await Promise.all([porIds(idsUsuario), catalogRepo.porIds(idsCatalogo)])
  const usados = refs.flatMap((r): AlimentoElegible[] => {
    if (r.tipo === 'user') {
      const f = propios.get(r.id)
      return f ? [elegibleDeFood(f)] : []
    }
    const f = delCatalogo.get(r.id)
    return f ? [elegibleDeCatalogo(f)] : []
  })
  if (usados.length >= limite) return usados
  const yaIncluidos = new Set(idsUsuario)
  const relleno = (await recientes(limite * 2)).filter((f) => !yaIncluidos.has(f.id)).map(elegibleDeFood)
  return [...usados, ...relleno].slice(0, limite)
}

export async function nombres(): Promise<string[]> {
  return (await db.foods.toArray()).map((f) => f.nombre)
}

/** Único punto de búsqueda por nombre: compara el nombre normalizado (sin tildes ni mayúsculas). */
export function buscarPorNombre(nombre: string): Promise<Food | undefined> {
  return db.foods.where('nombreNorm').equals(normalizeName(nombre)).first()
}

/** Busca varios nombres en una sola lectura. La clave del mapa es el nombre normalizado. */
export async function buscarPorNombres(nombres: string[]): Promise<Map<string, Food>> {
  const encontrados = await db.foods.where('nombreNorm').anyOf(nombres.map(normalizeName)).toArray()
  return new Map(encontrados.map((f) => [f.nombreNorm, f]))
}

/** Busca varios alimentos por id en una sola lectura (p. ej. para resolver los ítems de una plantilla, A1). La clave del mapa es el id. */
export async function porIds(ids: number[]): Promise<Map<number, Food>> {
  const encontrados = (await db.foods.bulkGet(ids)).filter((f): f is Food => f !== undefined)
  return new Map(encontrados.map((f) => [f.id, f]))
}

/** Lanza `NombreDuplicadoError` si ya hay un alimento con ese nombre. */
export async function crear(datos: FoodInput): Promise<number> {
  try {
    return await db.foods.add({ ...datos, nombreNorm: normalizeName(datos.nombre), updatedAt: Date.now() })
  } catch (e) {
    if (e instanceof Error && e.name === 'ConstraintError') throw new NombreDuplicadoError(datos.nombre)
    throw e
  }
}

/** Recalcula `nombreNorm` si cambia el nombre. Lanza `NombreDuplicadoError` si choca con otro alimento. */
export function actualizar(id: number, datos: FoodInput): Promise<void> {
  const nombreNorm = normalizeName(datos.nombre)
  return db.transaction('rw', db.foods, async () => {
    const otro = await db.foods.where('nombreNorm').equals(nombreNorm).first()
    if (otro && otro.id !== id) throw new NombreDuplicadoError(datos.nombre)
    await db.foods.update(id, { ...datos, nombreNorm, updatedAt: Date.now() })
  })
}

/** Borra el alimento y lo devuelve, para poder deshacer con `restaurar`. Las entradas no se tocan (guardan su snapshot). */
export function borrar(id: number): Promise<Food | undefined> {
  return db.transaction('rw', db.foods, async () => {
    const food = await db.foods.get(id)
    if (food) await db.foods.delete(id)
    return food
  })
}

/**
 * Vuelve a guardar un alimento borrado con su mismo id, así las entradas que lo referencian vuelven a enlazar.
 * Lanza `NombreDuplicadoError` si entretanto se ha creado otro alimento con ese nombre.
 */
export async function restaurar(food: Food): Promise<void> {
  try {
    await db.foods.put(food)
  } catch (e) {
    if (e instanceof Error && e.name === 'ConstraintError') throw new NombreDuplicadoError(food.nombre)
    throw e
  }
}

/**
 * Devuelve el id del alimento para guardar `item`, buscándolo por nombre (ver `decidirGuardado`).
 * Se llama siempre desde dentro de una transacción de entriesRepo.
 */
export async function resolverParaGuardar(item: ItemGuardado): Promise<number> {
  const existente = await buscarPorNombre(item.nombre)
  const valores = { kcal100: item.kcal100, prot100: item.prot100, carb100: item.carb100, grasa100: item.grasa100 }
  switch (decidirGuardado(existente, item)) {
    case 'crear':
      return db.foods.add({ nombreNorm: normalizeName(item.nombre), nombre: item.nombre, ...valores, fuente: item.fuenteSiNuevo, updatedAt: Date.now() })
    case 'reutilizar':
      return existente!.id
    case 'actualizar':
      await db.foods.update(existente!.id, { ...valores, fuente: 'manual', updatedAt: Date.now() })
      return existente!.id
  }
}
