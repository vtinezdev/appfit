// Acceso a la tabla `pesos` (un pesaje por día).
import { db } from '../../../shared/db/db'
import type { Peso } from '../../../shared/db/types'

/** Pesajes entre dos fechas YYYY-MM-DD, ambas incluidas, de más antiguo a más reciente. Solo lectura. */
export function delRango(desde: string, hasta: string): Promise<Peso[]> {
  return db.pesos.where('fecha').between(desde, hasta, true, true).toArray()
}

/** Registra el peso de un día; si ya había uno ese día, lo sobrescribe. */
export function registrar(fecha: string, kg: number): Promise<void> {
  return db.transaction('rw', db.pesos, async () => {
    const existente = await db.pesos.where('fecha').equals(fecha).first()
    if (existente) await db.pesos.update(existente.id, { kg, createdAt: Date.now() })
    else await db.pesos.add({ fecha, kg, createdAt: Date.now() } as Peso)
  })
}

/** Último pesaje con fecha ≤ `fecha` (los futuros se ignoran); `undefined` si no hay ninguno. Solo lectura. */
export function ultimoHasta(fecha: string): Promise<Peso | undefined> {
  return db.pesos.where('fecha').belowOrEqual(fecha).last()
}

/** Borra un pesaje y lo devuelve, para poder deshacer con `restaurar`. */
export function borrar(id: number): Promise<Peso | undefined> {
  return db.transaction('rw', db.pesos, async () => {
    const peso = await db.pesos.get(id)
    if (peso) await db.pesos.delete(id)
    return peso
  })
}

/** Repone un pesaje borrado con su mismo id. Si entretanto se registró otro peso ese día, no lo pisa y lanza. */
export function restaurar(peso: Peso): Promise<void> {
  return db.transaction('rw', db.pesos, async () => {
    const delDia = await db.pesos.where('fecha').equals(peso.fecha).first()
    if (delDia && delDia.id !== peso.id) throw new Error('Ya hay un pesaje de ese día.')
    await db.pesos.put(peso)
  })
}
