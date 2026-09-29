// Acceso a la tabla `workouts`. Las funciones de lectura no escriben: se pueden usar en un useLiveQuery.
import { db } from '../../../shared/db/db'
import type { Workout } from '../../../shared/db/types'

/** El entreno en curso (sin `fin`), si hay uno. */
export function activo(): Promise<Workout | undefined> {
  return db.workouts.filter((w) => w.fin === undefined).first()
}

/** Entrenos terminados, ordenados por `inicio` descendente. */
export function terminados(): Promise<Workout[]> {
  return db.workouts.filter((w) => w.fin !== undefined).reverse().sortBy('inicio')
}

export function listar(): Promise<Workout[]> {
  return db.workouts.toArray()
}

/**
 * Empieza un entreno (vacío o desde una rutina) y devuelve su id.
 * Si ya hay uno en curso devuelve ese: comprobar y crear van en la misma transacción,
 * así que un doble toque no deja dos entrenos activos.
 */
export function empezar(routineId?: number): Promise<number> {
  return db.transaction('rw', db.workouts, async () => {
    const enCurso = await db.workouts.filter((w) => w.fin === undefined).first()
    if (enCurso) return enCurso.id
    return db.workouts.add(routineId === undefined ? { inicio: Date.now() } : { inicio: Date.now(), routineId })
  })
}

export async function terminar(id: number): Promise<void> {
  await db.workouts.update(id, { fin: Date.now() })
}
