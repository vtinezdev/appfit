// Acceso a la tabla `workouts`. Las funciones de lectura no escriben: se pueden usar en un useLiveQuery.
import { db } from '../../../shared/db/db'
import type { SetEntry, Workout } from '../../../shared/db/types'
import { crearSnapshotMuscular } from '../lib/cargaMuscular'
import { valoresNuevaSerie } from '../lib/workout'
import { ultimaEfectiva } from './setsRepo'

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
  return db.transaction('rw', db.workouts, db.routines, db.sets, async () => {
    const enCurso = await db.workouts.filter((w) => w.fin === undefined).first()
    if (enCurso) return enCurso.id
    const id = await db.workouts.add(routineId === undefined ? { inicio: Date.now() } : { inicio: Date.now(), routineId })
    if (routineId !== undefined) await crearSeriesObjetivo(id, routineId)
    return id
  })
}

/**
 * Crea las series objetivo de cada ejercicio de la rutina que tenga objetivos, precargadas con los últimos
 * valores efectivos del ejercicio (o 8 × 20 kg). Va dentro de la transacción de quien la llama.
 */
async function crearSeriesObjetivo(workoutId: number, routineId: number, base = Date.now()): Promise<void> {
  const rutina = await db.routines.get(routineId)
  if (!rutina?.objetivos) return
  let orden = 0
  for (const exerciseId of rutina.exerciseIds) {
    const objetivo = rutina.objetivos[exerciseId]
    if (!objetivo) continue
    const valores = valoresNuevaSerie(await ultimaEfectiva(exerciseId))
    for (let i = 0; i < objetivo.series; i++) {
      await db.sets.add({ workoutId, exerciseId, orden: i, ...valores, createdAt: base + orden++ })
    }
  }
}

/** Borra un entreno (en curso o terminado) y todas sus series, todo o nada. */
export function descartar(id: number): Promise<void> {
  return db.transaction('rw', db.workouts, db.sets, async () => {
    await db.sets.where('workoutId').equals(id).delete()
    await db.workouts.delete(id)
  })
}

/** Borrar un entreno del historial: lo mismo que descartar. */
export const borrar = descartar

export class TiempoEntrenoInvalido extends Error {}

/**
 * Registra un entreno pasado ya terminado. Nunca crea un entreno activo (tiene `fin`), así que no interfiere
 * con el invariante «como mucho uno activo». Con rutina, crea sus series objetivo como al empezar.
 */
export function crearPasado(datos: { inicio: number; fin: number; routineId?: number }): Promise<number> {
  if (!(datos.fin > datos.inicio)) throw new TiempoEntrenoInvalido('El entreno debe terminar después de empezar.')
  return db.transaction('rw', db.workouts, db.routines, db.sets, db.exercises, async () => {
    const base: Omit<Workout, 'id'> = { inicio: datos.inicio, fin: datos.fin, ...(datos.routineId !== undefined ? { routineId: datos.routineId } : {}) }
    const id = await db.workouts.add(base as Workout)
    if (datos.routineId !== undefined) await crearSeriesObjetivo(id, datos.routineId, datos.inicio)
    await recalcularEn(id)
    return id
  })
}

/** Cambia inicio y fin de un entreno terminado. */
export function actualizarTiempos(id: number, inicio: number, fin: number): Promise<void> {
  if (!(fin > inicio)) throw new TiempoEntrenoInvalido('El entreno debe terminar después de empezar.')
  return db.transaction('rw', db.workouts, async () => {
    const w = await db.workouts.get(id)
    if (!w || w.fin === undefined) throw new Error('El entrenamiento ya no está disponible.')
    await db.workouts.update(id, { inicio, fin })
  })
}

async function recalcularEn(id: number): Promise<void> {
  const w = await db.workouts.get(id)
  if (!w || w.fin === undefined) return
  const sets = await db.sets.where('workoutId').equals(id).toArray()
  await db.workouts.update(id, { muscleSnapshot: crearSnapshotMuscular(sets, await db.exercises.toArray()) })
}

/**
 * Recalcula el `muscleSnapshot` de un entreno terminado con la clasificación actual de sus ejercicios
 * (se llama tras añadir o quitar series al editarlo). No toca entrenos en curso.
 */
export function recalcularSnapshot(id: number): Promise<void> {
  return db.transaction('rw', db.workouts, db.sets, db.exercises, () => recalcularEn(id))
}

export async function guardarNotas(id: number, notas: string): Promise<void> {
  await db.workouts.update(id, { notas: notas.trim() ? notas : undefined })
}

export async function guardarOrden(id: number, orden: number[]): Promise<void> {
  await db.workouts.update(id, { ordenEjercicios: orden })
}

export function obtener(id: number): Promise<Workout | undefined> {
  return db.workouts.get(id)
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
