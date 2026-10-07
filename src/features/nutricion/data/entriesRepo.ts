// Acceso a la tabla `entries` (lo que se ha comido). Las entradas guardan un snapshot de los macros,
// así que cambiar o borrar un alimento después no altera lo ya registrado.
import { db } from '../../../shared/db/db'
import { camposDeRef, refDe, type FoodRef } from '../../../shared/db/foodRef'
import type { Comida, Entry } from '../../../shared/db/types'
import type { ItemGuardado, KcalRapidasDraft, Por100 } from '../lib/alimentos'
import { macrosPorGramos } from '../lib/nutrition'
import { copiaEsNoOp, planCopia, type DestinoCopia } from '../lib/plantillas'
import * as foodsRepo from './foodsRepo'
import * as nombresAlimentosRepo from './nombresAlimentosRepo'
import { escalarNutrientes } from '../lib/nutrientes'
import { esComida } from '../lib/comidas'

export function delDia(fecha: string): Promise<Entry[]> {
  return db.entries.where('fecha').equals(fecha).toArray()
}

/** Fechas (YYYY-MM-DD) con alguna entrada, sin repetir. Solo lectura. */
export async function fechasConRegistro(): Promise<string[]> {
  return (await db.entries.orderBy('fecha').uniqueKeys()) as string[]
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
  nombrePlato?: string
  /** Añade al plato existente de esta fecha/comida, sin reescribir sus ingredientes. */
  platoDestinoId?: string
}

export class PlatoNoDisponibleError extends Error {
  constructor() {
    super('Este plato ya no está disponible en esta comida. Cierra y vuelve a abrir el plato.')
    this.name = 'PlatoNoDisponibleError'
  }
}

export class PlatoCambiadoError extends Error {
  constructor() {
    super('El plato ha cambiado. Cierra y vuelve a abrir el plato para mover todos sus ingredientes.')
    this.name = 'PlatoCambiadoError'
  }
}

/**
 * Guarda los alimentos revisados como entradas nuevas (creando o actualizando sus alimentos).
 * Varios ingredientes del mismo guardado comparten un plato, con identidad independiente de otros guardados.
 * Con destino explícito se valida y conserva el plato existente dentro de la transacción.
 * Un ítem con `catalogId` referencia el catálogo y no crea ni toca ningún alimento propio.
 * Todo o nada: si falla un alimento, no se guarda ninguno.
 */
export function guardarComida({ fecha, comida, items, textoOriginal, nombrePlato, platoDestinoId }: GuardarComidaInput): Promise<number[]> {
  const createdAt = Date.now()
  return db.transaction('rw', db.foods, db.entries, db.nombresAlimentos, async () => {
    let agrupacion: Pick<Entry, 'platoId' | 'nombrePlato'> = items.length > 1
      ? { platoId: crypto.randomUUID(), ...(nombrePlato?.trim() ? { nombrePlato: nombrePlato.trim() } : {}) }
      : {}
    if (platoDestinoId !== undefined) {
      const existentes = await db.entries.where('fecha').equals(fecha)
        .filter((e) => e.comida === comida && e.platoId === platoDestinoId).toArray()
      if (!platoDestinoId || existentes.length === 0) throw new PlatoNoDisponibleError()
      const nombreExistente = existentes.find((e) => e.nombrePlato?.trim())?.nombrePlato
      agrupacion = { platoId: platoDestinoId, ...(nombreExistente ? { nombrePlato: nombreExistente } : {}) }
    }
    const ids: number[] = []
    for (const item of items) {
      const ref: FoodRef = item.catalogId !== undefined ? { tipo: 'catalog', id: item.catalogId } : { tipo: 'user', id: await foodsRepo.resolverParaGuardar(item) }
      if (item.nombreCorto !== undefined) await nombresAlimentosRepo.guardarEnTransaccion(ref, item.nombreCorto)
      ids.push(
        await db.entries.add({
          fecha,
          comida,
          ...camposDeRef(ref),
          nombre: item.nombre,
          gramos: item.gramos,
          ...macrosPorGramos(item, item.gramos),
          textoOriginal,
          createdAt,
          ...agrupacion,
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
  /** `null` elimina una preferencia personal; `undefined` mantiene el valor guardado. */
  nombreCorto?: string | null
}

/**
 * Edita una entrada. Por defecto solo cambia esa entrada (su snapshot); el alimento guardado
 * solo se corrige si se pide expresamente con `aplicarAlAlimento`.
 */
export function editar(id: number, { comida, nombre, gramos, aplicarAlAlimento, nombreCorto, ...valores }: EditarInput): Promise<void> {
  return db.transaction('rw', db.foods, db.entries, db.nombresAlimentos, async () => {
    const entry = await db.entries.get(id)
    if (!entry) return
    if (nombreCorto !== undefined) {
      try {
        const ref = refDe(entry)
        if (ref) await nombresAlimentosRepo.guardarEnTransaccion(ref, nombreCorto)
      } catch {
        // Una referencia inválida o ausente no debe impedir editar la entrada.
      }
    }
    if (aplicarAlAlimento && entry.foodId !== undefined && (await db.foods.get(entry.foodId))) {
      await foodsRepo.actualizar(entry.foodId, { nombre, ...valores, fuente: 'manual' })
    }
    await db.entries.update(id, {
      comida,
      nombre,
      gramos,
      ...macrosPorGramos(valores, gramos),
      nutrientes: escalarNutrientes(valores.nutrientes, gramos / 100),
      // Mover un ingrediente a otra comida lo separa del plato original.
      ...(entry.platoId && entry.comida !== comida ? { platoId: undefined, nombrePlato: undefined } : {}),
    })
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

export interface MoverPlatoInput {
  fecha: string
  origen: Comida
  destino: Comida
  platoId: string
  /** Evita mover un grupo sustituido o parcialmente cambiado durante el gesto/Deshacer. */
  idsEsperados: number[]
}

export interface MovimientoPlato {
  fecha: string
  origen: Comida
  destino: Comida
  platoId: string
  ids: number[]
}

/** Mueve el grupo completo, sin copiarlo ni recalcular snapshots. Todo o nada.
 * Si el mismo id existe en destino (p. ej. un backup antiguo), asigna otro al
 * grupo movido para no fusionar platos independientes. No cambia fecha/createdAt.
 */
export function moverPlato({ fecha, origen, destino, platoId, idsEsperados }: MoverPlatoInput): Promise<MovimientoPlato | null> {
  if (!esComida(origen) || !esComida(destino)) return Promise.reject(new Error('Comida no válida.'))
  if (origen === destino) return Promise.resolve(null)
  return db.transaction('rw', db.entries, async () => {
    const delDia = await db.entries.where('fecha').equals(fecha).toArray()
    const plato = delDia.filter(e => e.comida === origen && e.platoId === platoId)
    if (!platoId.trim() || !plato.length) throw new PlatoNoDisponibleError()
    const esperados = new Set(idsEsperados)
    if (!esperados.size || esperados.size !== idsEsperados.length || plato.length !== esperados.size || plato.some(e => !esperados.has(e.id))) {
      throw new PlatoCambiadoError()
    }
    const idDestino = delDia.some(e => e.comida === destino && e.platoId === platoId) ? crypto.randomUUID() : platoId
    await db.entries.bulkPut(plato.map(e => ({ ...e, comida: destino, platoId: idDestino })))
    return { fecha, origen, destino, platoId: idDestino, ids: plato.map(e => e.id) }
  })
}

/** Solo revierte la ubicación: conserva ediciones posteriores y nunca resucita borrados. */
export function deshacerMovimientoPlato(movimiento: MovimientoPlato): Promise<MovimientoPlato | null> {
  return moverPlato({ ...movimiento, origen: movimiento.destino, destino: movimiento.origen, idsEsperados: movimiento.ids })
}

export interface CopiarInput {
  origen: DestinoCopia & { platoId?: string }
  destino: DestinoCopia
}

/**
 * Copia el snapshot de las entradas del origen al destino (A2): «Copiar a otro día» (con `comida`)
 * o «Copiar el día a…» (sin `comida`, conserva la de cada entrada).
 * Con `platoId` limita el origen a ese plato; permite otra comida del mismo día. Todo o nada.
 */
export function copiar({ origen, destino }: CopiarInput): Promise<number[]> {
  const loteId = crypto.randomUUID()
  return db.transaction('rw', db.entries, async () => {
    if (copiaEsNoOp(origen, destino)) return []
    const deLaFecha = await db.entries.where('fecha').equals(origen.fecha).toArray()
    const entradas = deLaFecha.filter((e) =>
      (origen.comida === undefined || e.comida === origen.comida)
      && (origen.platoId === undefined || e.platoId === origen.platoId),
    )
    if (entradas.length === 0) return []
    return db.entries.bulkAdd(planCopia(entradas, destino, Date.now(), loteId), { allKeys: true })
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
