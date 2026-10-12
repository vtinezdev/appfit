// Acceso a la tabla `cheatDays`: una marca por día (`&fecha`). Las lecturas no escriben (se usan en useLiveQuery).
import { db } from '../../../shared/db/db'
import type { CheatDay } from '../../../shared/db/types'

/** Fechas marcadas entre dos fechas YYYY-MM-DD, ambas incluidas, en orden. */
export async function entreFechas(desde: string, hasta: string): Promise<string[]> {
  return (await db.cheatDays.where('fecha').between(desde, hasta, true, true).keys()) as string[]
}

/** Todas las fechas marcadas, en orden. */
export async function todas(): Promise<string[]> {
  return (await db.cheatDays.orderBy('fecha').keys()) as string[]
}

/** Marca el día; si ya lo estaba, no hace nada (idempotente ante dos toques). */
export function marcar(fecha: string): Promise<void> {
  return db.transaction('rw', db.cheatDays, async () => {
    if (!(await db.cheatDays.where('fecha').equals(fecha).first())) await db.cheatDays.add({ fecha, createdAt: Date.now() })
  })
}

/** Quita la marca del día y la devuelve (para «Deshacer»); `undefined` si no estaba marcado. */
export function quitar(fecha: string): Promise<CheatDay | undefined> {
  return db.transaction('rw', db.cheatDays, async () => {
    const marca = await db.cheatDays.where('fecha').equals(fecha).first()
    if (marca) await db.cheatDays.delete(marca.id)
    return marca
  })
}

/** Vuelve a poner una marca quitada, con su id y fecha de creación, salvo que el día ya esté marcado otra vez. */
export function restaurar(marca: CheatDay): Promise<void> {
  return db.transaction('rw', db.cheatDays, async () => {
    if (!(await db.cheatDays.where('fecha').equals(marca.fecha).first())) await db.cheatDays.put(marca)
  })
}
