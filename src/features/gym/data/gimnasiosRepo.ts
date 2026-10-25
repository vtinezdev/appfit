// Acceso a la tabla `gimnasios` (ADR 054). Las funciones de lectura no escriben: se pueden usar en un useLiveQuery.
import { db } from '../../../shared/db/db'
import { getSettings, updateSettings } from '../../../shared/db/settings'
import type { Gimnasio } from '../../../shared/db/types'
import { validarNombreGimnasio, validarNombreHabitual } from '../lib/gimnasios'

/** Los gimnasios guardados por nombre. El habitual no está: es la ausencia de `gimnasioId`. */
export async function listar(): Promise<Gimnasio[]> {
  return (await db.gimnasios.toArray()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

/** Crea un gimnasio y devuelve su id. Lanza si el nombre no vale o ya existe. */
export function crear(nombre: string): Promise<number> {
  return db.transaction('rw', db.gimnasios, db.settings, async () => {
    const datos = validarNombreGimnasio(nombre, await db.gimnasios.toArray(), undefined, (await getSettings()).nombreGimnasioHabitual)
    return db.gimnasios.add(datos as Gimnasio)
  })
}

export function renombrar(id: number, nombre: string): Promise<void> {
  return db.transaction('rw', db.gimnasios, db.settings, async () => {
    if (!(await db.gimnasios.get(id))) throw new Error('Ese gimnasio ya no está disponible.')
    await db.gimnasios.update(id, validarNombreGimnasio(nombre, await db.gimnasios.toArray(), id, (await getSettings()).nombreGimnasioHabitual))
  })
}

/** Nombre del gimnasio habitual, si se le puso. Solo lectura. */
export async function nombreHabitual(): Promise<string | undefined> {
  return (await getSettings()).nombreGimnasioHabitual
}

/** Pone nombre al gimnasio habitual (vacío lo quita y vuelve a «Gimnasio habitual»). Lanza si repite el de otro gimnasio. */
export function renombrarHabitual(nombre: string): Promise<void> {
  return db.transaction('rw', db.gimnasios, db.settings, async () => {
    await updateSettings({ nombreGimnasioHabitual: validarNombreHabitual(nombre, await db.gimnasios.toArray()) })
  })
}

/** ¿Algún entreno lo usa? Mientras lo use, no se puede borrar (sus series perderían el nombre). */
export async function enUso(id: number): Promise<boolean> {
  return (await db.workouts.filter(w => w.gimnasioId === id).count()) > 0
}

export class GimnasioEnUso extends Error {}

/** Borra un gimnasio que ningún entreno usa. */
export function borrar(id: number): Promise<void> {
  return db.transaction('rw', db.gimnasios, db.workouts, async () => {
    if (await enUso(id)) throw new GimnasioEnUso('Tiene entrenos registrados: no se puede borrar. Puedes renombrarlo.')
    await db.gimnasios.delete(id)
  })
}
