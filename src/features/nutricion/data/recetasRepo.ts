// Acceso a la tabla `recetas`. Cada receta mantiene un `Food` propio (valores por 100 g del peso cocinado), así que
// funciona en búsqueda, frecuentes, intérprete y entradas sin tocar el invariante foodId/catalogId.
// Las funciones de lectura no escriben nunca, así que se pueden usar dentro de un useLiveQuery.
import { db } from '../../../shared/db/db'
import type { FoodRef } from '../../../shared/db/foodRef'
import type { MealItem, Receta } from '../../../shared/db/types'
import { normalizeName } from '../../../shared/lib/text'
import { esCategoriaAlimento, type CategoriaAlimento } from '../lib/catalogo/categorias'
import { elegibleDeFood, itemDesdeElegible, mismosValores, por100DesdeEntrada, type ItemRevision } from '../lib/alimentos'
import { itemDeIngrediente, limpiarPasos, por100DeReceta, validarReceta, type Preparacion } from '../lib/recetas'
import { vistaDeRecetaCatalogo, vistaDeRecetaPropia, type RecetaVista } from '../lib/variantes'
import * as catalogRepo from './catalogRepo'
import { NombreDuplicadoError } from './foodsRepo'

export interface RecetaInput extends Preparacion {
  nombre: string
  ingredientes: MealItem[]
  pesoCocinadoG: number
  /** Categoría del alimento de la receta. Se guarda solo en el `Food` (es su única fuente). */
  categoria: CategoriaAlimento
}

/** Categoría que se propone para una receta nueva o para una cuyo alimento aún no tiene. */
export const CATEGORIA_RECETA_POR_DEFECTO: CategoriaAlimento = 'Platos preparados'

/** La receta no es válida (nombre, ingredientes, peso o preparación). El mensaje se puede mostrar tal cual. */
export class RecetaInvalidaError extends Error {}

export function listar(): Promise<Receta[]> {
  return db.recetas.orderBy('nombreNorm').toArray()
}

export function obtener(id: number): Promise<Receta | undefined> {
  return db.recetas.get(id)
}

/**
 * La receta que hay detrás de un alimento elegido: la propia cuyo `Food` es ese, o el plato del catálogo con su
 * receta y sus ingredientes resueltos. `null` si no es una receta (o le falta algún ingrediente). Solo lectura.
 */
export async function vista(ref: FoodRef): Promise<RecetaVista | null> {
  if (ref.tipo === 'user') {
    const receta = await db.recetas.where('foodId').equals(ref.id).first()
    return receta ? vistaDeRecetaPropia(receta) : null
  }
  const plato = await catalogRepo.obtener(ref.id)
  if (!plato?.receta) return null
  return vistaDeRecetaCatalogo(plato, await catalogRepo.porIds(plato.receta.ingredientes.map((i) => i.catalogId)))
}

/**
 * Ingredientes como ítems de la revisión (para cambiarlos al añadir una receta). Los del catálogo conservan su
 * referencia; los de una receta propia, que solo guardan el nombre, se enlazan con tu alimento de ese nombre si
 * existe y sigue teniendo los mismos valores, para no crear alimentos repetidos al guardar. Solo lectura.
 */
export async function itemsDeIngredientes(ingredientes: MealItem[]): Promise<ItemRevision[]> {
  return Promise.all(ingredientes.map(async (m) => {
    if (m.catalogId !== undefined || m.gramos <= 0) return itemDeIngrediente(m)
    const food = await db.foods.where('nombreNorm').equals(normalizeName(m.nombre)).first()
    return food && mismosValores(food, por100DesdeEntrada(m)) ? itemDesdeElegible(elegibleDeFood(food), m.gramos) : itemDeIngrediente(m)
  }))
}

/** Recetas cuyo alimento es uno de `foodIds`, por foodId. Solo lectura. */
export async function porAlimentos(foodIds: readonly number[]): Promise<Map<number, Receta>> {
  if (foodIds.length === 0) return new Map()
  const recetas = await db.recetas.where('foodId').anyOf([...foodIds]).toArray()
  return new Map(recetas.map((r) => [r.foodId, r]))
}

function valoresFood(datos: RecetaInput) {
  const v = por100DeReceta(datos.ingredientes, datos.pesoCocinadoG)
  return { kcal100: v.kcal100, prot100: v.prot100, carb100: v.carb100, grasa100: v.grasa100, ...(v.nutrientes ? { nutrientes: v.nutrientes } : {}), categoria: datos.categoria }
}

/**
 * Preparación tal como se guarda: pasos sin vacíos y notas recortadas; lo que falta queda `undefined`, que en
 * `update` borra el campo (así se puede quitar el tiempo o las notas).
 */
function preparacionDe(datos: RecetaInput): { raciones: number | undefined; pasos: string[] | undefined; tiempoMin: number | undefined; notas: string | undefined } {
  const pasos = limpiarPasos(datos.pasos ?? [])
  const notas = datos.notas?.trim()
  return { raciones: datos.raciones, pasos: pasos.length ? pasos : undefined, tiempoMin: datos.tiempoMin, notas: notas || undefined }
}

function validar(datos: RecetaInput) {
  const error = validarReceta(datos.nombre, datos.ingredientes, datos.pesoCocinadoG, preparacionDe(datos)) ?? (esCategoriaAlimento(datos.categoria) ? null : 'Elige una categoría para la receta.')
  if (error) throw new RecetaInvalidaError(error)
}

/** Crea la receta y su alimento en una transacción. Un alimento con ese nombre → `NombreDuplicadoError`. */
export async function crear(datos: RecetaInput): Promise<number> {
  validar(datos)
  const nombre = datos.nombre.trim()
  const nombreNorm = normalizeName(nombre)
  return db.transaction('rw', db.recetas, db.foods, async () => {
    if (await db.foods.where('nombreNorm').equals(nombreNorm).first()) throw new NombreDuplicadoError(nombre)
    const ahora = Date.now()
    const foodId = await db.foods.add({ nombre, nombreNorm, ...valoresFood(datos), fuente: 'manual', updatedAt: ahora })
    const preparacion = Object.fromEntries(Object.entries(preparacionDe(datos)).filter(([, v]) => v !== undefined)) as Preparacion
    return db.recetas.add({ nombre, nombreNorm, ingredientes: datos.ingredientes, pesoCocinadoG: datos.pesoCocinadoG, ...preparacion, foodId, createdAt: ahora, updatedAt: ahora })
  })
}

/** Categoría actual del alimento de la receta (o `undefined` si no tiene o se borró). Solo lectura. */
export async function categoriaDe(receta: Pick<Receta, 'foodId'>): Promise<string | undefined> {
  return (await db.foods.get(receta.foodId))?.categoria
}

/**
 * Actualiza la receta y su alimento (nombre, categoría y valores por 100 g). Las entradas ya guardadas conservan su snapshot.
 * Si el alimento se borró desde Alimentos, se vuelve a crear y la receta lo recupera.
 */
export async function actualizar(id: number, datos: RecetaInput): Promise<void> {
  validar(datos)
  const nombre = datos.nombre.trim()
  const nombreNorm = normalizeName(nombre)
  return db.transaction('rw', db.recetas, db.foods, async () => {
    const receta = await db.recetas.get(id)
    if (!receta) throw new RecetaInvalidaError('La receta ya no existe.')
    const otro = await db.foods.where('nombreNorm').equals(nombreNorm).first()
    if (otro && otro.id !== receta.foodId) throw new NombreDuplicadoError(nombre)
    const ahora = Date.now()
    const valores = { nombre, nombreNorm, ...valoresFood(datos), fuente: 'manual' as const, updatedAt: ahora }
    let foodId = receta.foodId
    if (await db.foods.get(foodId)) await db.foods.put({ id: foodId, ...valores })
    else foodId = await db.foods.add(valores)
    await db.recetas.update(id, { nombre, nombreNorm, ingredientes: datos.ingredientes, pesoCocinadoG: datos.pesoCocinadoG, ...preparacionDe(datos), foodId, updatedAt: ahora })
  })
}

/**
 * Borra la receta y sus variantes; el alimento asociado se conserva (las entradas y plantillas que lo usan siguen
 * enlazadas) o se borra.
 */
export function borrar(id: number, conservarAlimento: boolean): Promise<void> {
  return db.transaction('rw', db.recetas, db.foods, db.variantesReceta, async () => {
    const receta = await db.recetas.get(id)
    if (!receta) return
    await db.recetas.delete(id)
    await db.variantesReceta.where('recetaId').equals(id).delete()
    if (!conservarAlimento) await db.foods.delete(receta.foodId)
  })
}
