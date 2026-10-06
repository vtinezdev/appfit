// Acceso a la tabla `exercises`. Las funciones de lectura no escriben: se pueden usar en un useLiveQuery.
import { db } from '../../../shared/db/db'
import type { Exercise } from '../../../shared/db/types'
import { normalizeName } from '../../../shared/lib/text'
import { CATALOGO_POR_ID, MUSCULOS, EQUIPAMIENTO } from '../lib/catalogoEjercicios'
import { ErrorSeleccionEjercicio, catalogoDeLocal, type SeleccionEjercicio } from '../lib/selectorEjercicios'

export function listar(): Promise<Exercise[]> {
  return db.exercises.toArray()
}

/**
 * Id del ejercicio con ese nombre (comparando el nombre normalizado); si no existe, lo crea.
 * Atómico: dos llamadas seguidas con el mismo nombre no chocan con el índice único `&nombreNorm`.
 */
export function obtenerOCrear(nombre: string): Promise<number> {
  const limpio = nombre.trim()
  const nombreNorm = normalizeName(limpio)
  return db.transaction('rw', db.exercises, async () => {
    const existente = await db.exercises.where('nombreNorm').equals(nombreNorm).first()
    if (existente) return existente.id
    return db.exercises.add({ nombre: limpio, nombreNorm, grupo: 'General' })
  })
}

/** Selección estable: conserva todos los ids históricos y la clasificación de los personalizados. */
export function resolverSeleccion(seleccion: SeleccionEjercicio): Promise<number> {
  return db.transaction('rw', db.exercises, async () => {
    if (seleccion.tipo === 'local') {
      const e = await db.exercises.get(seleccion.id)
      if (!e) throw new ErrorSeleccionEjercicio('El ejercicio ya no está disponible.')
      return e.id
    }
    if (seleccion.tipo === 'personalizado') {
      const nombre = seleccion.nombre.trim()
      if (!nombre || !(seleccion.musculo in MUSCULOS) || !(seleccion.equipo in EQUIPAMIENTO)) throw new ErrorSeleccionEjercicio('Completa el nombre, músculo y equipamiento.')
      const nombreNorm = normalizeName(nombre)
      if (await db.exercises.where('nombreNorm').equals(nombreNorm).first()) throw new ErrorSeleccionEjercicio('Ya tienes un ejercicio con ese nombre. Búscalo en el catálogo o elige otro nombre.')
      return db.exercises.add({ nombre, nombreNorm, grupo: MUSCULOS[seleccion.musculo], primaryMuscles: [seleccion.musculo], secondaryMuscles: [], equipment: [seleccion.equipo] })
    }
    const c = CATALOGO_POR_ID.get(seleccion.catalogId)
    if (!c) throw new ErrorSeleccionEjercicio('El ejercicio no está disponible en el catálogo.')
    const locales = await db.exercises.toArray()
    const previo = locales.find(e => e.catalogId === c.id) ?? locales.find(e => catalogoDeLocal(e)?.id === c.id)
    if (previo) {
      if (!previo.catalogId) await db.exercises.update(previo.id, { catalogId: c.id, primaryMuscles: [...c.primaryMuscles], secondaryMuscles: [...c.secondaryMuscles], equipment: [...c.equipment] })
      return previo.id
    }
    if (locales.some(e => e.nombreNorm === normalizeName(c.name))) throw new ErrorSeleccionEjercicio('Ya tienes un ejercicio personalizado con ese nombre. Selecciónalo en la lista.')
    return db.exercises.add({ nombre: c.name, nombreNorm: normalizeName(c.name), grupo: MUSCULOS[c.primaryMuscles[0]], catalogId: c.id,
      primaryMuscles: [...c.primaryMuscles], secondaryMuscles: [...c.secondaryMuscles], equipment: [...c.equipment] })
  })
}
