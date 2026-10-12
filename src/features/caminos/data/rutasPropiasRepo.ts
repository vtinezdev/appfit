// Acceso a la tabla `rutasPropias` (rutas propias de Caminos). Las lecturas no escriben: se pueden usar en un useLiveQuery.
import { db } from '../../../shared/db/db'
import { getSettings } from '../../../shared/db/settings'
import type { RutaPropia } from '../../../shared/db/types'
import { idDeRutaPropia, validarRutaPropia, type BorradorRuta } from '../lib/rutasPropias'

export class RutaPropiaInvalida extends Error {}
/** La ruta está en el viaje de Caminos (en curso o terminada): borrarla cambiaría lo recorrido. */
export class RutaEnUso extends Error {}

export function listar(): Promise<RutaPropia[]> {
  return db.rutasPropias.orderBy('id').toArray()
}

export function obtener(id: number): Promise<RutaPropia | undefined> {
  return db.rutasPropias.get(id)
}

function limpiar(b: BorradorRuta): Pick<RutaPropia, 'nombre' | 'salida' | 'etapas'> {
  const error = validarRutaPropia(b)
  if (error) throw new RutaPropiaInvalida(error)
  return {
    nombre: b.nombre.trim(),
    salida: { ...b.salida!, nombre: b.salida!.nombre.trim() },
    etapas: b.etapas.map((e) => ({ ...e, nombre: e.nombre.trim(), km: Math.round(e.km! * 10) / 10 })),
  }
}

/** Crea la ruta y devuelve su id. */
export async function crear(b: BorradorRuta, ahora = Date.now()): Promise<number> {
  return db.rutasPropias.add({ ...limpiar(b), createdAt: ahora, updatedAt: ahora } as RutaPropia)
}

/** Sustituye la salida, las etapas y el nombre. Lo recorrido se recalcula con las etapas nuevas. */
export function actualizar(id: number, b: BorradorRuta, ahora = Date.now()): Promise<void> {
  const datos = limpiar(b)
  return db.transaction('rw', db.rutasPropias, async () => {
    const r = await db.rutasPropias.get(id)
    if (!r) throw new RutaPropiaInvalida('La ruta ya no está disponible.')
    await db.rutasPropias.put({ ...r, ...datos, updatedAt: ahora })
  })
}

/** ¿Está la ruta en el viaje de Caminos (elegida, en curso o terminada)? Solo lectura. */
export async function enUso(id: number): Promise<boolean> {
  return (await getSettings()).caminos?.ruta.includes(idDeRutaPropia(id)) ?? false
}

/** Borra una ruta que no esté en el viaje (si lo está, lanza `RutaEnUso`). */
export function borrar(id: number): Promise<void> {
  return db.transaction('rw', db.rutasPropias, db.settings, async () => {
    if (await enUso(id)) throw new RutaEnUso('Esta ruta está en tu viaje de Caminos: no se puede borrar.')
    await db.rutasPropias.delete(id)
  })
}
