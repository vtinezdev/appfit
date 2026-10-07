// Acceso a la tabla `porciones`: raciones propias por alimento (`ref` = clave estable de un FoodRef).
// Las funciones de lectura no escriben nunca, así que se pueden usar dentro de un useLiveQuery.
import { db } from '../../../shared/db/db'
import type { Porcion } from '../../../shared/db/types'
import { validarPorcion } from '../lib/interprete/porciones'

/** La ración no es válida (nombre o gramos) o ya existe una con ese nombre para el alimento. */
export class PorcionInvalidaError extends Error {}

export function todas(): Promise<Porcion[]> {
  return db.porciones.toArray()
}

/** Raciones de un alimento (`claveRef`), por nombre. */
export async function delAlimento(ref: string): Promise<Porcion[]> {
  return (await db.porciones.where('ref').equals(ref).toArray()).sort((a, b) => a.nombreNorm.localeCompare(b.nombreNorm, 'es'))
}

async function validarUnica(ref: string, nombre: string, gramos: number, id?: number) {
  const v = validarPorcion(nombre, gramos)
  if (typeof v === 'string') throw new PorcionInvalidaError(v)
  const otra = (await db.porciones.where('ref').equals(ref).toArray()).find((p) => p.nombreNorm === v.nombreNorm && p.id !== id)
  if (otra) throw new PorcionInvalidaError(`Este alimento ya tiene una ración llamada «${otra.nombre}».`)
  return v
}

export function crear(ref: string, nombre: string, gramos: number): Promise<number> {
  return db.transaction('rw', db.porciones, async () => {
    const v = await validarUnica(ref, nombre, gramos)
    return db.porciones.add({ ref, ...v })
  })
}

export function actualizar(id: number, nombre: string, gramos: number): Promise<void> {
  return db.transaction('rw', db.porciones, async () => {
    const p = await db.porciones.get(id)
    if (!p) throw new PorcionInvalidaError('La ración ya no existe.')
    const v = await validarUnica(p.ref, nombre, gramos, id)
    await db.porciones.update(id, v)
  })
}

/** Borra la ración y la devuelve, para poder deshacer con `restaurar`. */
export function borrar(id: number): Promise<Porcion | undefined> {
  return db.transaction('rw', db.porciones, async () => {
    const p = await db.porciones.get(id)
    if (p) await db.porciones.delete(id)
    return p
  })
}

/** Repone una ración borrada con su mismo id (si entretanto se creó otra igual, lanza). */
export function restaurar(p: Porcion): Promise<void> {
  return db.transaction('rw', db.porciones, async () => {
    const otra = (await db.porciones.where('ref').equals(p.ref).toArray()).find((x) => x.nombreNorm === p.nombreNorm && x.id !== p.id)
    if (otra) throw new PorcionInvalidaError(`Ya hay otra ración llamada «${otra.nombre}».`)
    await db.porciones.put(p)
  })
}

/**
 * Clave estable (`claveRef`) del alimento al que corresponde un ítem de la revisión: uno propio guardado (se busca
 * por su nombre de origen) o uno del catálogo. `undefined` si el ítem aún no es un alimento guardado. Solo lectura.
 */
export async function refDeItem(origen: { guardado: boolean; nombreNorm: string; catalogId?: string }): Promise<string | undefined> {
  if (origen.catalogId !== undefined) return `catalog:${origen.catalogId}`
  if (!origen.guardado) return undefined
  const food = await db.foods.where('nombreNorm').equals(origen.nombreNorm).first()
  return food ? `user:${food.id}` : undefined
}
