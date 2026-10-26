// Acceso a la tabla `planificadas` (B16): comidas colocadas en hoy o en días futuros que no cuentan en nada hasta
// «Lo he comido», que las pasa a `entries`. Van aparte de `entries` a propósito (ADR 059). Se escriben con las mismas
// formas que el diario (revisión, añadido rápido, kcal rápidas y comidas típicas) desde Añadir comida en modo planificar.
import { db } from '../../../shared/db/db'
import { camposDeRef, type FoodRef } from '../../../shared/db/foodRef'
import { getSettings, updateSettings } from '../../../shared/db/settings'
import type { Comida, Entry, MealItem, Planificada } from '../../../shared/db/types'
import type { ItemGuardado, KcalRapidasDraft } from '../lib/alimentos'
import { macrosPorGramos } from '../lib/nutrition'
import { sePuedePlanificar } from '../lib/planificadas'
import { entradasDesdePlantilla, type DestinoPlantilla } from '../lib/plantillas'
import * as foodsRepo from './foodsRepo'
import * as nombresAlimentosRepo from './nombresAlimentosRepo'

/** Se intenta planificar en un día pasado. */
export class FechaNoPlanificable extends Error {
  constructor() { super('Solo se puede planificar hoy y días futuros.') }
}

const rechazarSiPasado = (fecha: string, hoy: string) => sePuedePlanificar(fecha, hoy) ? null : Promise.reject(new FechaNoPlanificable())

/** Las planificadas de un día. Solo lectura. */
export function delDia(fecha: string): Promise<Planificada[]> {
  return db.planificadas.where('fecha').equals(fecha).toArray()
}

/** Todas las planificadas, por fecha. Pocas filas: lo que queda por comer. Solo lectura. */
export function todas(): Promise<Planificada[]> {
  return db.planificadas.orderBy('fecha').toArray()
}

/** Las planificadas de hoy y de días pasados que quedaron sin marcar (lo que se puede comer ya). Solo lectura. */
export function hastaFecha(hoy: string): Promise<Planificada[]> {
  return db.planificadas.where('fecha').belowOrEqual(hoy).toArray()
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
  const rechazo = rechazarSiPasado(destino.fecha, hoy)
  if (rechazo) return rechazo
  const loteId = crypto.randomUUID()
  return db.transaction('rw', db.foods, db.planificadas, async () => {
    if (items.length === 0) return []
    const foodsById = await foodsRepo.porIds(items.map((it) => it.foodId).filter((id): id is number => id !== undefined))
    return db.planificadas.bulkAdd(entradasDesdePlantilla({ items: [...items] }, foodsById, destino, Date.now(), loteId), { allKeys: true })
  })
}

export interface PlanificarRevisionInput {
  fecha: string
  comida: Comida
  items: ItemGuardado[]
  nombrePlato?: string
}

/**
 * Planifica los alimentos revisados, como `entriesRepo.guardarComida` en el diario: crea o actualiza sus alimentos
 * (o referencia el catálogo) y agrupa varios en un plato. Todo o nada.
 */
export function planificarRevision({ fecha, comida, items, nombrePlato }: PlanificarRevisionInput, hoy: string): Promise<number[]> {
  const rechazo = rechazarSiPasado(fecha, hoy)
  if (rechazo) return rechazo
  const createdAt = Date.now()
  return db.transaction('rw', db.foods, db.planificadas, db.nombresAlimentos, async () => {
    const agrupacion: Pick<Planificada, 'platoId' | 'nombrePlato'> = items.length > 1
      ? { platoId: crypto.randomUUID(), ...(nombrePlato?.trim() ? { nombrePlato: nombrePlato.trim() } : {}) }
      : {}
    const ids: number[] = []
    for (const item of items) {
      const ref: FoodRef = item.catalogId !== undefined ? { tipo: 'catalog', id: item.catalogId } : { tipo: 'user', id: await foodsRepo.resolverParaGuardar(item) }
      if (item.nombreCorto !== undefined) await nombresAlimentosRepo.guardarEnTransaccion(ref, item.nombreCorto)
      ids.push(await db.planificadas.add({ fecha, comida, ...camposDeRef(ref), nombre: item.nombre, gramos: item.gramos, ...macrosPorGramos(item, item.gramos), createdAt, ...agrupacion }))
    }
    return ids
  })
}

export interface PlanificarAlimentoInput {
  fecha: string
  comida: Comida
  ref: FoodRef
  gramos: number
}

/**
 * Añadido rápido planificado: un alimento propio o del catálogo con sus valores actuales, sin tocarlo.
 * `undefined` si ya no existe.
 */
export async function planificarAlimento({ fecha, comida, ref, gramos }: PlanificarAlimentoInput, hoy: string): Promise<number | undefined> {
  const rechazo = rechazarSiPasado(fecha, hoy)
  if (rechazo) return rechazo
  const food = ref.tipo === 'user' ? await db.foods.get(ref.id) : await db.catalogFoods.get(ref.id)
  if (!food) return undefined
  return db.planificadas.add({ fecha, comida, ...camposDeRef(ref), nombre: food.nombre, gramos, ...macrosPorGramos(food, gramos), createdAt: Date.now() })
}

/** «Kcal rápidas» planificadas (una comida fuera): no salen en la lista de la compra. */
export function planificarRapida({ fecha, comida, nombre, kcal, prot, carb, grasa }: KcalRapidasDraft & { fecha: string; comida: Comida }, hoy: string): Promise<number> {
  const rechazo = rechazarSiPasado(fecha, hoy)
  if (rechazo) return rechazo
  return db.planificadas.add({ fecha, comida, nombre, gramos: 0, kcal, prot, carb, grasa, rapida: true, createdAt: Date.now() })
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

/** Lo ya marcado como comprado en la lista de la compra (claves de artículo). Solo lectura. */
export async function marcasCompra(): Promise<string[]> {
  return (await getSettings()).compraMarcada ?? []
}

export async function guardarMarcasCompra(claves: string[]): Promise<void> {
  await updateSettings({ compraMarcada: claves.length ? claves : undefined })
}
