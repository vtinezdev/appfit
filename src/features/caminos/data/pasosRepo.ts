// Acceso a la tabla `pasos`: el total de pasos de cada día (`&fecha`), apuntado a mano. Las lecturas no escriben nunca.
import { db } from '../../../shared/db/db'
import type { DiaPasos } from '../../../shared/db/types'
import { ERROR_PASOS, validarPasos } from '../lib/pasos'
import type { DiasSemana } from '../lib/semanaPasos'

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
  return restaurarSemana([{ fecha, antes }])
}

/** Lo que había en cada día antes de `guardarSemana`, para «Deshacer» con `restaurarSemana`. */
export type AntesSemana = { fecha: string; antes: DiaPasos | undefined }[]

/**
 * Apunta varios días de una vez (la semana): sustituye los que tuvieran y borra los que van sin pasos (`null`). Todo o
 * nada; devuelve lo que había en cada día.
 */
export function guardarSemana(dias: DiasSemana): Promise<AntesSemana> {
  if (dias.some((d) => d.pasos !== null && validarPasos(d.pasos) === null)) return Promise.reject(new PasosInvalidos(ERROR_PASOS))
  return db.transaction('rw', db.pasos, async () => {
    const ahora = Date.now()
    const anteriores: AntesSemana = []
    for (const { fecha, pasos } of dias) {
      const antes = await db.pasos.where('fecha').equals(fecha).first()
      anteriores.push({ fecha, antes })
      if (pasos === null) { if (antes) await db.pasos.delete(antes.id) }
      else if (antes) await db.pasos.update(antes.id, { pasos, updatedAt: ahora })
      else await db.pasos.add({ fecha, pasos, createdAt: ahora, updatedAt: ahora })
    }
    return anteriores
  })
}

/** Deja cada día como estaba (deshace `guardarSemana`, `guardar` o `borrar`). */
export function restaurarSemana(anteriores: AntesSemana): Promise<void> {
  return db.transaction('rw', db.pasos, async () => {
    for (const { fecha, antes } of anteriores) {
      await db.pasos.where('fecha').equals(fecha).delete()
      if (antes) await db.pasos.put(antes)
    }
  })
}
