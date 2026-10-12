// Acceso a la tabla `routines`. Las funciones de lectura no escriben: se pueden usar en un useLiveQuery.
import { db } from '../../../shared/db/db'
import type { Routine } from '../../../shared/db/types'
import { resolverSeleccion } from './exercisesRepo'
import { ErrorSustitucion, sustituirEnRutina } from '../lib/rutinas'
import type { SeleccionEjercicio } from '../lib/selectorEjercicios'
import { rutinasDelPlan, type PlanCreador } from '../lib/creadorRutinas'

export type RoutineInput = Omit<Routine, 'id'> & { id?: number }

export function listar(): Promise<Routine[]> {
  return db.routines.toArray()
}

export function obtener(id: number): Promise<Routine | undefined> {
  return db.routines.get(id)
}

/** Crea la rutina si no trae `id`, o la actualiza. Devuelve su id. */
export async function guardar({ id, nombre, exerciseIds, objetivos }: RoutineInput): Promise<number> {
  // Los objetivos solo se guardan para ejercicios que siguen en la rutina.
  const vigentes = objetivos && Object.fromEntries(Object.entries(objetivos).filter(([k]) => exerciseIds.includes(Number(k))))
  const conObjetivos = vigentes && Object.keys(vigentes).length > 0 ? vigentes : undefined
  if (id) {
    await db.routines.update(id, { nombre, exerciseIds, objetivos: conObjetivos })
    return id
  }
  return db.routines.add(conObjetivos ? { nombre, exerciseIds, objetivos: conObjetivos } : { nombre, exerciseIds })
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
    await db.routines.put(sustituirEnRutina(antes, de, nuevo))
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
      for (const { seleccion, objetivo } of rutina.ejercicios) {
        const id = await resolverSeleccion(seleccion)
        if (exerciseIds.includes(id)) continue
        exerciseIds.push(id)
        objetivos[id] = { ...objetivo }
      }
      ids.push(await db.routines.add({ nombre: rutina.nombre, exerciseIds, objetivos }))
    }
    return ids
  })
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
