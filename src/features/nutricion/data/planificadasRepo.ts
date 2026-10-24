// Acceso a la tabla `planificadas` (B16): comidas colocadas en hoy o en días futuros que no cuentan en nada hasta
// «Lo he comido», que las pasa a `entries`. Van aparte de `entries` a propósito (ADR 059).
import { db } from '../../../shared/db/db'
import type { Comida, Entry, MealItem, Planificada } from '../../../shared/db/types'
import { sePuedePlanificar } from '../lib/planificadas'
import { entradasDesdePlantilla, type DestinoPlantilla } from '../lib/plantillas'
import * as foodsRepo from './foodsRepo'

/** Se intenta planificar en un día pasado o demasiado lejos. */
export class FechaNoPlanificable extends Error {
  constructor() { super('Solo se puede planificar hoy y los próximos días.') }
}

/** Todas las planificadas, por fecha. Pocas filas: lo que queda por comer. Solo lectura. */
export function todas(): Promise<Planificada[]> {
  return db.planificadas.orderBy('fecha').toArray()
}

/** Las planificadas entre dos fechas (incluidas), para la lista de la compra. Solo lectura. */
export function entreFechas(desde: string, hasta: string): Promise<Planificada[]> {
  return db.planificadas.where('fecha').between(desde, hasta, true, true).toArray()
}

/**
 * Coloca los alimentos de una comida típica en un día (hoy o futuro) y una comida. Resuelve cada ítem con el alimento
 * actual, como al aplicar una plantilla. Devuelve los ids creados.
 */
export function planificar(items: readonly MealItem[], destino: DestinoPlantilla, hoy: string): Promise<number[]> {
  if (!sePuedePlanificar(destino.fecha, hoy)) return Promise.reject(new FechaNoPlanificable())
  const loteId = crypto.randomUUID()
  return db.transaction('rw', db.foods, db.planificadas, async () => {
    if (items.length === 0) return []
    const foodsById = await foodsRepo.porIds(items.map((it) => it.foodId).filter((id): id is number => id !== undefined))
    return db.planificadas.bulkAdd(entradasDesdePlantilla({ items: [...items] }, foodsById, destino, Date.now(), loteId), { allKeys: true })
  })
}

export interface Comido {
  /** Ids de las entradas creadas. */
  entradas: number[]
  /** Las planificadas que se pasaron, para deshacer. */
  planificadas: Planificada[]
}

/**
 * «Lo he comido»: pasa las planificadas de esa comida y ese día a `entries`, todo o nada. Solo hoy o un día pasado
 * (lo planificado que quedó sin marcar); un día futuro no se puede comer todavía.
 */
export function loHeComido(fecha: string, comida: Comida, hoy: string): Promise<Comido> {
  if (fecha > hoy) return Promise.resolve({ entradas: [], planificadas: [] })
  return db.transaction('rw', db.planificadas, db.entries, async () => {
    const planificadas = (await db.planificadas.where('fecha').equals(fecha).toArray()).filter((p) => p.comida === comida)
    if (planificadas.length === 0) return { entradas: [], planificadas }
    const ahora = Date.now()
    const nuevas: Omit<Entry, 'id'>[] = planificadas.map(({ id: _id, ...p }) => ({ ...p, createdAt: ahora }))
    const entradas = await db.entries.bulkAdd(nuevas, { allKeys: true })
    await db.planificadas.bulkDelete(planificadas.map((p) => p.id))
    return { entradas, planificadas }
  })
}

/** Deshace «Lo he comido»: quita esas entradas y vuelve a poner las planificadas como estaban. */
export function deshacerComido(c: Comido): Promise<void> {
  return db.transaction('rw', db.planificadas, db.entries, async () => {
    await db.entries.bulkDelete(c.entradas)
    await db.planificadas.bulkPut(c.planificadas)
  })
}

/** Borra planificadas y las devuelve para «Deshacer». */
export function borrar(ids: readonly number[]): Promise<Planificada[]> {
  return db.transaction('rw', db.planificadas, async () => {
    const filas = (await db.planificadas.bulkGet([...ids])).filter((p): p is Planificada => p !== undefined)
    await db.planificadas.bulkDelete(filas.map((p) => p.id))
    return filas
  })
}

export async function restaurar(filas: readonly Planificada[]): Promise<void> {
  await db.planificadas.bulkPut([...filas])
}
