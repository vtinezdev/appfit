// Acceso a la tabla `workouts`. Las funciones de lectura no escriben: se pueden usar en un useLiveQuery.
import { db } from '../../../shared/db/db'
import type { SetEntry, Workout } from '../../../shared/db/types'
import { crearSnapshotMuscular } from '../lib/cargaMuscular'

/** El entreno en curso (sin `fin`), si hay uno. */
export function activo(): Promise<Workout | undefined> {
  return db.workouts.filter((w) => w.fin === undefined).first()
}

/** Entrenos terminados, ordenados por `inicio` descendente. */
export function terminados(): Promise<Workout[]> {
  return db.workouts.filter((w) => w.fin !== undefined).reverse().sortBy('inicio')
}

/** El último entreno terminado (el de `inicio` más reciente), si hay alguno. */
export function ultimoTerminado(): Promise<Workout | undefined> {
  return db.workouts.orderBy('inicio').reverse().filter((w) => w.fin !== undefined).first()
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

/** Cierre y clasificación coherentes con las series guardadas; idempotente ante un doble cierre. */
export function terminar(id: number): Promise<{ workout: Workout; sets: SetEntry[] }> {
  return db.transaction('rw', db.workouts, db.exercises, db.sets, async () => {
    const workout = await db.workouts.get(id)
    if (!workout) throw new Error('El entrenamiento ya no está disponible.')
    const sets = await db.sets.where('workoutId').equals(id).toArray()
    if (workout.fin !== undefined) return { workout, sets }
    const muscleSnapshot = crearSnapshotMuscular(sets, await db.exercises.toArray())
    const fin = Date.now()
    await db.workouts.update(id, { fin, muscleSnapshot })
    return { workout: { ...workout, fin, muscleSnapshot }, sets }
  })
}
