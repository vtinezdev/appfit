// Acceso a la tabla `routines`. Las funciones de lectura no escriben: se pueden usar en un useLiveQuery.
import { db } from '../../../shared/db/db'
import { validarEjecucion } from '../lib/ejecucion'
import type { ObjetivoEjercicio, Routine } from '../../../shared/db/types'
import { resolverSeleccion } from './exercisesRepo'
import { ErrorSustitucion, sustituirEnRutina } from '../lib/rutinas'
import { sanearObjetivo } from '../lib/objetivos'
import type { SeleccionEjercicio } from '../lib/selectorEjercicios'
import { nombreLibre, rutinasDelPlan, type PlanCreador } from '../lib/creadorRutinas'
import { rutinaDesdeEntreno } from '../lib/repetirEntreno'
import { superseriesValidas, type ConSuperseries } from '../lib/superseries'

/** Con las superseries (A21), un campo del registro que el tipo de `shared` no declara. */
export type RoutineInput = Omit<Routine, 'id'> & ConSuperseries & { id?: number }

export function listar(): Promise<Routine[]> {
  return db.routines.toArray()
}

export function obtener(id: number): Promise<Routine | undefined> {
  return db.routines.get(id)
}

/** Crea la rutina si no trae `id`, o la actualiza. Devuelve su id. */
export function guardar({ id, nombre, exerciseIds, objetivos, agarres, ejecuciones, superseries }: RoutineInput): Promise<number> {
  return db.transaction('rw', db.routines, async () => {
    const anterior = id ? await db.routines.get(id) : undefined
    const deLaRutina = <T>(r: Record<number, T> | undefined) => r && Object.fromEntries(Object.entries(r).filter(([k]) => exerciseIds.includes(Number(k)))) as Record<number, T>
    const vigentes = deLaRutina(objetivos)
    const fuente = agarres ?? anterior?.agarres
    const elegidos = deLaRutina(fuente)
    for (const agarre of Object.values(elegidos ?? {})) if (agarre) validarEjecucion({ ejecucion: 'bilateral', agarre })
    const fuenteEjecuciones = ejecuciones ?? anterior?.ejecuciones
    const ejecucionesElegidas = deLaRutina(fuenteEjecuciones)
    validarEjecucionesRutina(ejecucionesElegidas)
    const datos = { nombre, exerciseIds, objetivos: vigentes && Object.keys(vigentes).length ? vigentes : undefined,
      ...(fuente !== undefined ? { agarres: elegidos && Object.keys(elegidos).length ? elegidos : undefined } : {}),
      ...(fuenteEjecuciones !== undefined ? { ejecuciones: ejecucionesElegidas && Object.keys(ejecucionesElegidas).length ? ejecucionesElegidas : undefined } : {}),
      // Solo los pares que siguen juntos en este orden; sin ninguno, el campo se quita.
      ...(superseries !== undefined ? { superseries: superseriesValidas(superseries, exerciseIds).length ? superseriesValidas(superseries, exerciseIds) : undefined } : {}) }
    if (id) { await db.routines.update(id, datos); return id }
    return db.routines.add(datos)
  })
}

/**
 * Sustituye un ejercicio de la rutina por otro (del catálogo o propio), que hereda su objetivo, en una transacción.
 * Devuelve la rutina de antes, para deshacer con `restaurar`.
 */
export function sustituirEjercicio(routineId: number, de: number, por: SeleccionEjercicio): Promise<Routine> {
  return db.transaction('rw', db.routines, db.exercises, async () => {
    const antes = await db.routines.get(routineId)
    if (!antes) throw new ErrorSustitucion('La rutina ya no existe.')
    const nuevo = await resolverSeleccion(por)
    const sustituida = { ...sustituirEnRutina(antes, de, nuevo) }
    if (por.agarre !== undefined) sustituida.agarres = { ...sustituida.agarres, [nuevo]: por.agarre }
    await db.routines.put(sustituida)
    return antes
  })
}

/**
 * Guarda el plan del creador como rutinas normales, en una transacción: resuelve cada ejercicio (crea el del catálogo
 * que aún no exista), quita repetidos dentro de una rutina y da a cada una un nombre libre («Torso A (2)» si ya existe).
 * Si algo falla, no queda nada a medias. Devuelve los ids, en el orden del plan.
 */
export function guardarPlan(plan: PlanCreador): Promise<number[]> {
  return db.transaction('rw', db.routines, db.exercises, async () => {
    const existentes = (await db.routines.toArray()).map((r) => r.nombre)
    const ids: number[] = []
    for (const rutina of rutinasDelPlan(plan, existentes)) {
      const exerciseIds: number[] = []
      const objetivos: Routine['objetivos'] = {}
      const agarres: NonNullable<Routine['agarres']> = {}
      for (const { seleccion, objetivo } of rutina.ejercicios) {
        const id = await resolverSeleccion(seleccion)
        if (exerciseIds.includes(id)) continue
        exerciseIds.push(id)
        objetivos[id] = { ...objetivo }
        if (seleccion.agarre !== undefined) agarres[id] = seleccion.agarre
      }
      ids.push(await db.routines.add({ nombre: rutina.nombre, exerciseIds, objetivos, ...(Object.keys(agarres).length ? { agarres } : {}) }))
    }
    return ids
  })
}

/**
 * Guarda una rutina compartida por otra persona (ADR 055) como rutina nueva: un nombre libre frente a las existentes y
 * cada ejercicio elegido con su objetivo, sin repetir. Devuelve su id. Lanza `RutinaVacia` sin ejercicios.
 */
export function guardarCompartida(nombre: string, ejercicios: { seleccion: SeleccionEjercicio; objetivo?: ObjetivoEjercicio }[]): Promise<number> {
  return db.transaction('rw', db.routines, db.exercises, async () => {
    const exerciseIds: number[] = []
    const objetivos: NonNullable<Routine['objetivos']> = {}
    for (const { seleccion, objetivo } of ejercicios) {
      const id = await resolverSeleccion(seleccion)
      if (exerciseIds.includes(id)) continue
      exerciseIds.push(id)
      if (objetivo) objetivos[id] = sanearObjetivo(objetivo)
    }
    if (!exerciseIds.length) throw new RutinaVacia('Elige al menos un ejercicio para guardar la rutina.')
    const libre = nombreLibre(nombre.trim() || 'Rutina', (await db.routines.toArray()).map((r) => r.nombre))
    return db.routines.add({ nombre: libre, exerciseIds, ...(Object.keys(objetivos).length ? { objetivos } : {}) })
  })
}

/**
 * Guarda como rutina nueva lo que se hizo en un entreno terminado (`rutinaDesdeEntreno`), con un nombre libre frente a
 * las rutinas que ya existen. Devuelve su id, para «Deshacer» con `borrar`.
 */
export function guardarDesdeEntreno(workoutId: number, nombre: string): Promise<number> {
  return db.transaction('rw', db.routines, db.workouts, db.sets, async () => {
    const w = await db.workouts.get(workoutId)
    if (!w || w.fin === undefined) throw new Error('Ese entreno ya no está disponible.')
    const rutina = rutinaDesdeEntreno(w, await db.sets.where('workoutId').equals(workoutId).toArray())
    if (!rutina.exerciseIds.length) throw new RutinaVacia('Este entreno no tiene ejercicios que guardar.')
    for (const agarre of Object.values(rutina.agarres ?? {})) if (agarre) validarEjecucion({ ejecucion: 'bilateral', agarre })
    validarEjecucionesRutina(rutina.ejecuciones)
    const libre = nombreLibre(nombre.trim() || 'Rutina', (await db.routines.toArray()).map((r) => r.nombre))
    return db.routines.add({ nombre: libre, ...rutina })
  })
}

export class RutinaVacia extends Error {}

function validarEjecucionesRutina(ejecuciones: Routine['ejecuciones']): void {
  for (const e of Object.values(ejecuciones ?? {})) if (e !== 'bilateral' && e !== 'lados') throw new Error('Selecciona una ejecución válida.')
}

/** Borra varias rutinas a la vez (deshacer lo guardado con el creador). */
export async function borrarVarias(ids: number[]): Promise<void> {
  await db.routines.bulkDelete(ids)
}

/** Deja la rutina como estaba (Deshacer). */
export async function restaurar(r: Routine): Promise<void> {
  await db.routines.put(r)
}

/**
 * Borra la rutina. Los entrenos que se crearon desde ella conservan su `routineId`, que ya no
 * resuelve: Historial y Progreso no lo usan, y mientras hay un entreno activo no se ve la pestaña Rutinas.
 */
export async function borrar(id: number): Promise<void> {
  await db.routines.delete(id)
}
