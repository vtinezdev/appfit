// Acceso a la tabla `pasos`: el total de pasos de cada día (`&fecha`), apuntado a mano. Las lecturas no escriben nunca.
import { db } from '../../../shared/db/db'
import type { DiaPasos } from '../../../shared/db/types'
import { ERROR_PASOS, validarPasos } from '../lib/pasos'

export class PasosInvalidos extends Error {}

/** Todos los días con pasos, de más antiguo a más reciente. */
export function todos(): Promise<DiaPasos[]> {
  return db.pasos.orderBy('fecha').toArray()
}

/** Apunta el total de un día (sustituye el que hubiera) y devuelve el anterior, para «Deshacer» con `restaurar`. */
export function guardar(fecha: string, pasos: number): Promise<DiaPasos | undefined> {
  if (validarPasos(pasos) === null) return Promise.reject(new PasosInvalidos(ERROR_PASOS))
  return db.transaction('rw', db.pasos, async () => {
    const antes = await db.pasos.where('fecha').equals(fecha).first()
    const ahora = Date.now()
    if (antes) await db.pasos.update(antes.id, { pasos, updatedAt: ahora })
    else await db.pasos.add({ fecha, pasos, createdAt: ahora, updatedAt: ahora })
    return antes
  })
}

/** Borra los pasos de un día y los devuelve, para «Deshacer» con `restaurar`. */
export function borrar(fecha: string): Promise<DiaPasos | undefined> {
  return db.transaction('rw', db.pasos, async () => {
    const antes = await db.pasos.where('fecha').equals(fecha).first()
    if (antes) await db.pasos.delete(antes.id)
    return antes
  })
}

/** Deja el día como estaba: con la fila `antes` (con su id) o sin pasos si no había. */
export function restaurar(fecha: string, antes: DiaPasos | undefined): Promise<void> {
  return db.transaction('rw', db.pasos, async () => {
    await db.pasos.where('fecha').equals(fecha).delete()
    if (antes) await db.pasos.put(antes)
  })
}
