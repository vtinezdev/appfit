// Acceso a la tabla `exercises`. Las funciones de lectura no escriben: se pueden usar en un useLiveQuery.
import { db } from '../../../shared/db/db'
import type { Exercise } from '../../../shared/db/types'
import { normalizeName } from '../../../shared/lib/text'

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
