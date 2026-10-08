// Acceso a la tabla `sets` (series). Las funciones de lectura no escriben: se pueden usar en un useLiveQuery.
import { aplicarEjecucion, validarSerie, tieneReps, convencional, cambiaRealizacion } from '../lib/ejecucion'
import Dexie from 'dexie'
import { db } from '../../../shared/db/db'
import type { SetEntry } from '../../../shared/db/types'
import { siguienteOrden, valoresNuevaSerie } from '../lib/workout'
import * as exercisesRepo from './exercisesRepo'
import type { SeleccionEjercicio } from '../lib/selectorEjercicios'
import { aplicarConfiguracionCarga } from '../lib/carga'
import { toISODate } from '../../../shared/lib/dates'

export function todas(): Promise<SetEntry[]> {
  return db.sets.toArray()
}

export function delWorkout(workoutId: number): Promise<SetEntry[]> {
  return db.sets.where('workoutId').equals(workoutId).toArray()
}

export function delEjercicio(exerciseId: number): Promise<SetEntry[]> {
  return db.sets.where('exerciseId').equals(exerciseId).toArray()
}

/** Última serie efectiva (no de calentamiento) del ejercicio, de cualquier entreno. Solo lectura. */
export function ultimaEfectiva(exerciseId: number): Promise<SetEntry | undefined> {
  return db.sets.where('[exerciseId+createdAt]').between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey]).reverse().filter((s) => s.tipo !== 'calentamiento' && convencional(s)).first()
}

/**
 * Añade una serie al ejercicio dentro del entreno, repitiendo reps y peso de la última serie
 * de ese ejercicio. El `orden` se calcula dentro de la transacción: dos toques seguidos dan dos
 * series con órdenes distintos.
 */
export function agregar(workoutId: number, exerciseId: number, createdAt: number = Date.now()): Promise<number> {
  return db.transaction('rw', db.sets, db.workouts, db.pesos, db.exercises, async () => {
    const delEntreno = await db.sets.where('workoutId').equals(workoutId).filter((s) => s.exerciseId === exerciseId).toArray()
    const previa = [...delEntreno].filter(s => s.tipo !== 'calentamiento').sort((a, b) => a.orden - b.orden).at(-1) ?? await ultimaEfectiva(exerciseId)
    const workout = await db.workouts.get(workoutId)
    const valores = valoresNuevaSerie(previa)
    const carga = workout?.cargasEjercicios?.[exerciseId]
    if (carga) Object.assign(valores, aplicarConfiguracionCarga(valores, carga))
    else if (valores.modoCarga && previa?.workoutId !== workoutId) valores.pesoCorporal = (await db.pesos.where('fecha').belowOrEqual(toISODate(new Date(workout?.inicio ?? createdAt))).last())?.kg
    const ejecucion = workout?.ejecucionesEjercicios?.[exerciseId] ?? (await db.exercises.get(exerciseId))?.ejecucionHabitual
    if (ejecucion) Object.assign(valores, aplicarEjecucion(valores, ejecucion))
    const id = await db.sets.add({
      workoutId,
      exerciseId,
      orden: siguienteOrden(delEntreno),
      ...valores,
      createdAt,
    })
    if (workout?.ejerciciosOmitidos?.includes(exerciseId)) {
      const omitidos = workout.ejerciciosOmitidos.filter(id => id !== exerciseId)
      await db.workouts.update(workoutId, { ejerciciosOmitidos: omitidos.length ? omitidos : undefined })
    }
    return id
  })
}

/** Busca o crea el ejercicio por nombre y le añade la primera serie. Todo o nada. */
export function agregarConEjercicio(workoutId: number, nombre: string): Promise<number> {
  return db.transaction('rw', db.exercises, db.sets, db.workouts, db.pesos, db.exercises, async () => {
    const exerciseId = await exercisesRepo.obtenerOCrear(nombre)
    return agregar(workoutId, exerciseId)
  })
}

/** Resolver identidad y primera serie en una sola transacción: un fallo no deja un ejercicio huérfano. */
export function agregarSeleccion(workoutId: number, seleccion: SeleccionEjercicio, createdAt: number = Date.now()): Promise<number> {
  return db.transaction('rw', db.exercises, db.sets, db.workouts, db.pesos, db.exercises, async () => {
    const exerciseId = await exercisesRepo.resolverSeleccion(seleccion)
    return agregar(workoutId, exerciseId, createdAt)
  })
}

export type CambiosSerie = Partial<Pick<SetEntry, 'reps' | 'peso' | 'tipo' | 'rir' | 'ejecucion' | 'kgUnilateral' | 'agarre' | 'lados' | 'soloNegativas' | 'excentricaSeg' | 'bajadas'>>
/** Edición física invalida confirmación; cambiar solo RIR/tipo la conserva. */
export function actualizar(id: number, patch: CambiosSerie): Promise<void> {
  return db.transaction('rw', db.sets, async () => {
    const serie = await db.sets.get(id)
    if (!serie) throw new Error('La serie ya no está disponible.')
    validarSerie({ ...serie, ...patch })
    const cambia = cambiaRealizacion(serie, patch)
    await db.sets.update(id, { ...patch, ...(cambia ? { realizada: false } : {}) })
  })
}
export function confirmar(id: number, realizada: boolean): Promise<void> {
  return db.transaction('rw', db.sets, async () => {
    const s = await db.sets.get(id)
    if (s) validarSerie(s)
    if (!s || realizada && !tieneReps(s)) throw new Error('Introduce las repeticiones antes de confirmar.')
    await db.sets.update(id, { realizada })
  })
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
