// Acceso a la tabla `routines`. Las funciones de lectura no escriben: se pueden usar en un useLiveQuery.
import { db } from '../../../shared/db/db'
import type { Routine } from '../../../shared/db/types'

export type RoutineInput = Omit<Routine, 'id'> & { id?: number }

export function listar(): Promise<Routine[]> {
  return db.routines.toArray()
}

export function obtener(id: number): Promise<Routine | undefined> {
  return db.routines.get(id)
}

/** Crea la rutina si no trae `id`, o la actualiza. Devuelve su id. */
export async function guardar({ id, nombre, exerciseIds }: RoutineInput): Promise<number> {
  if (id) {
    await db.routines.update(id, { nombre, exerciseIds })
    return id
  }
  return db.routines.add({ nombre, exerciseIds })
}

/**
 * Borra la rutina. Los entrenos que se crearon desde ella conservan su `routineId`, que ya no
 * resuelve: Historial y Progreso no lo usan, y mientras hay un entreno activo no se ve la pestaña Rutinas.
 */
export async function borrar(id: number): Promise<void> {
  await db.routines.delete(id)
}
