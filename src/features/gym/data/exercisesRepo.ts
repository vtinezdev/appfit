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

/** Un ejercicio es editable si es propio: sin vínculo al catálogo ni equivalente exacto en él. */
export function esPersonalizado(e: Exercise): boolean {
  return !e.catalogId && !catalogoDeLocal(e)
}

/** Ejercicios propios, por nombre. Solo lectura. */
export async function personalizados(): Promise<Exercise[]> {
  const todos = await db.exercises.toArray()
  return todos.filter(esPersonalizado).sort((a, b) => a.nombreNorm.localeCompare(b.nombreNorm, 'es'))
}

/** Cuántas series y rutinas usan el ejercicio. Solo lectura. */
export async function usoDe(id: number): Promise<{ series: number; rutinas: number }> {
  const [series, rutinas] = await Promise.all([
    db.sets.where('exerciseId').equals(id).count(),
    db.routines.filter((r) => r.exerciseIds.includes(id)).count(),
  ])
  return { series, rutinas }
}

export interface CambiosEjercicio { nombre: string; musculo: keyof typeof MUSCULOS; equipo: keyof typeof EQUIPAMIENTO }

/** Renombra y reclasifica un ejercicio propio, respetando `&nombreNorm` (duplicado → ErrorSeleccionEjercicio). */
export function editarPersonalizado(id: number, cambios: CambiosEjercicio): Promise<void> {
  const nombre = cambios.nombre.trim()
  return db.transaction('rw', db.exercises, async () => {
    const e = await db.exercises.get(id)
    if (!e) throw new ErrorSeleccionEjercicio('El ejercicio ya no está disponible.')
    if (!esPersonalizado(e)) throw new ErrorSeleccionEjercicio('Los ejercicios del catálogo no se pueden editar.')
    if (!nombre || !(cambios.musculo in MUSCULOS) || !(cambios.equipo in EQUIPAMIENTO)) throw new ErrorSeleccionEjercicio('Completa el nombre, músculo y equipamiento.')
    const nombreNorm = normalizeName(nombre)
    const otro = await db.exercises.where('nombreNorm').equals(nombreNorm).first()
    if (otro && otro.id !== id) throw new ErrorSeleccionEjercicio('Ya tienes un ejercicio con ese nombre.')
    await db.exercises.update(id, { nombre, nombreNorm, grupo: MUSCULOS[cambios.musculo], primaryMuscles: [cambios.musculo], equipment: [cambios.equipo], secondaryMuscles: e.secondaryMuscles ?? [] })
  })
}

/** Borra un ejercicio propio solo si no tiene series ni está en rutinas; si lo está, lanza con el motivo. */
export function borrarPersonalizado(id: number): Promise<Exercise> {
  return db.transaction('rw', db.exercises, db.sets, db.routines, async () => {
    const e = await db.exercises.get(id)
    if (!e) throw new ErrorSeleccionEjercicio('El ejercicio ya no está disponible.')
    if (!esPersonalizado(e)) throw new ErrorSeleccionEjercicio('Los ejercicios del catálogo no se pueden borrar.')
    const uso = await usoDe(id)
    if (uso.series > 0 || uso.rutinas > 0) throw new ErrorSeleccionEjercicio(motivoNoBorrable(uso))
    await db.exercises.delete(id)
    return e
  })
}

export function motivoNoBorrable(uso: { series: number; rutinas: number }): string {
  const partes: string[] = []
  if (uso.series > 0) partes.push(`tiene ${uso.series} ${uso.series === 1 ? 'serie registrada' : 'series registradas'}`)
  if (uso.rutinas > 0) partes.push(`está en ${uso.rutinas} ${uso.rutinas === 1 ? 'rutina' : 'rutinas'}`)
  return `No se puede borrar: ${partes.join(' y ')}.`
}

/** Vuelve a guardar un ejercicio borrado con su mismo id (para «Deshacer»). */
export async function restaurar(e: Exercise): Promise<void> {
  await db.exercises.put(e)
}
