// Acceso a la tabla `sets` (series). Las funciones de lectura no escriben: se pueden usar en un useLiveQuery.
import Dexie from 'dexie'
import { db } from '../../../shared/db/db'
import type { SetEntry } from '../../../shared/db/types'
import { siguienteOrden, valoresNuevaSerie } from '../lib/workout'
import * as exercisesRepo from './exercisesRepo'

export function todas(): Promise<SetEntry[]> {
  return db.sets.toArray()
}

export function delWorkout(workoutId: number): Promise<SetEntry[]> {
  return db.sets.where('workoutId').equals(workoutId).toArray()
}

export function delEjercicio(exerciseId: number): Promise<SetEntry[]> {
  return db.sets.where('exerciseId').equals(exerciseId).toArray()
}

/**
 * Añade una serie al ejercicio dentro del entreno, repitiendo reps y peso de la última serie
 * de ese ejercicio. El `orden` se calcula dentro de la transacción: dos toques seguidos dan dos
 * series con órdenes distintos.
 */
export function agregar(workoutId: number, exerciseId: number): Promise<number> {
  return db.transaction('rw', db.sets, async () => {
    const delEntreno = await db.sets.where('workoutId').equals(workoutId).filter((s) => s.exerciseId === exerciseId).toArray()
    const previa = await db.sets.where('[exerciseId+createdAt]').between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey]).last()
    return db.sets.add({
      workoutId,
      exerciseId,
      orden: siguienteOrden(delEntreno),
      ...valoresNuevaSerie(previa),
      createdAt: Date.now(),
    })
  })
}

/** Busca o crea el ejercicio por nombre y le añade la primera serie. Todo o nada. */
export function agregarConEjercicio(workoutId: number, nombre: string): Promise<number> {
  return db.transaction('rw', db.exercises, db.sets, async () => {
    const exerciseId = await exercisesRepo.obtenerOCrear(nombre)
    return agregar(workoutId, exerciseId)
  })
}

export async function actualizar(id: number, patch: Partial<Pick<SetEntry, 'reps' | 'peso'>>): Promise<void> {
  await db.sets.update(id, patch)
}

/** Borra la serie y la devuelve, para poder deshacer con `restaurar`. */
export function borrar(id: number): Promise<SetEntry | undefined> {
  return db.transaction('rw', db.sets, async () => {
    const set = await db.sets.get(id)
    if (set) await db.sets.delete(id)
    return set
  })
}

/** Vuelve a guardar series borradas con sus mismos ids. */
export async function restaurar(sets: SetEntry[]): Promise<void> {
  await db.sets.bulkPut(sets)
}
