// Acceso a la tabla `recetas`. Cada receta mantiene un `Food` propio (valores por 100 g del peso cocinado), así que
// funciona en búsqueda, frecuentes, intérprete y entradas sin tocar el invariante foodId/catalogId.
// Las funciones de lectura no escriben nunca, así que se pueden usar dentro de un useLiveQuery.
import { db } from '../../../shared/db/db'
import type { MealItem, Receta } from '../../../shared/db/types'
import { normalizeName } from '../../../shared/lib/text'
import { por100DeReceta, validarReceta } from '../lib/recetas'
import { NombreDuplicadoError } from './foodsRepo'

export interface RecetaInput {
  nombre: string
  ingredientes: MealItem[]
  pesoCocinadoG: number
}

/** La receta no es válida (nombre, ingredientes o peso). El mensaje se puede mostrar tal cual. */
export class RecetaInvalidaError extends Error {}

export function listar(): Promise<Receta[]> {
  return db.recetas.orderBy('nombreNorm').toArray()
}

export function obtener(id: number): Promise<Receta | undefined> {
  return db.recetas.get(id)
}

function valoresFood(datos: RecetaInput) {
  const v = por100DeReceta(datos.ingredientes, datos.pesoCocinadoG)
  return { kcal100: v.kcal100, prot100: v.prot100, carb100: v.carb100, grasa100: v.grasa100, ...(v.nutrientes ? { nutrientes: v.nutrientes } : {}) }
}

function validar(datos: RecetaInput) {
  const error = validarReceta(datos.nombre, datos.ingredientes, datos.pesoCocinadoG)
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
    return db.recetas.add({ nombre, nombreNorm, ingredientes: datos.ingredientes, pesoCocinadoG: datos.pesoCocinadoG, foodId, createdAt: ahora, updatedAt: ahora })
  })
}

/**
 * Actualiza la receta y su alimento (nombre y valores por 100 g). Las entradas ya guardadas conservan su snapshot.
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
    await db.recetas.update(id, { nombre, nombreNorm, ingredientes: datos.ingredientes, pesoCocinadoG: datos.pesoCocinadoG, foodId, updatedAt: ahora })
  })
}

/** Borra la receta; el alimento asociado se conserva (las entradas y plantillas que lo usan siguen enlazadas) o se borra. */
export function borrar(id: number, conservarAlimento: boolean): Promise<void> {
  return db.transaction('rw', db.recetas, db.foods, async () => {
    const receta = await db.recetas.get(id)
    if (!receta) return
    await db.recetas.delete(id)
    if (!conservarAlimento) await db.foods.delete(receta.foodId)
  })
}
