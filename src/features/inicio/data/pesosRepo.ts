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
