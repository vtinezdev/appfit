// Acceso a la tabla `agua`: los ml bebidos por día (`&fecha`). Las lecturas no escriben nunca.
import { db } from '../../../shared/db/db'
import type { Agua } from '../../../shared/db/types'
import { validarTomaAgua } from '../lib/agua'

export class TomaAguaInvalidaError extends Error {}

export function delDia(fecha: string): Promise<Agua | undefined> {
  return db.agua.where('fecha').equals(fecha).first()
}

/** Días entre dos fechas (ambas incluidas), de más antiguo a más reciente. */
export function entreFechas(desde: string, hasta: string): Promise<Agua[]> {
  return db.agua.where('fecha').between(desde, hasta, true, true).toArray()
}

/** Suma una toma al día (crea la fila si no existe). Devuelve el total del día. */
export function anadir(fecha: string, ml: number): Promise<number> {
  const toma = validarTomaAgua(ml)
  if (toma === null) throw new TomaAguaInvalidaError('La cantidad debe estar entre 1 y 5.000 ml.')
  return db.transaction('rw', db.agua, async () => {
    const fila = await db.agua.where('fecha').equals(fecha).first()
    if (!fila) {
      await db.agua.add({ fecha, ml: toma, tomas: [toma] })
      return toma
    }
    // Si la fila viene de un backup sin detalle, su total se conserva como una toma anterior.
    const previas = fila.tomas ?? (fila.ml > 0 ? [fila.ml] : [])
    const tomas = [...previas, toma]
    const total = tomas.reduce((a, t) => a + t, 0)
    await db.agua.update(fila.id, { tomas, ml: total })
    return total
  })
}

/** Quita la última toma del día y la devuelve (`undefined` si no había ninguna). Si el día queda a 0, se borra la fila. */
export function quitarUltima(fecha: string): Promise<number | undefined> {
  return db.transaction('rw', db.agua, async () => {
    const fila = await db.agua.where('fecha').equals(fecha).first()
    if (!fila) return undefined
    const tomas = fila.tomas ?? (fila.ml > 0 ? [fila.ml] : [])
    const ultima = tomas[tomas.length - 1]
    if (ultima === undefined) return undefined
    const resto = tomas.slice(0, -1)
    if (resto.length === 0) await db.agua.delete(fila.id)
    else await db.agua.update(fila.id, { tomas: resto, ml: resto.reduce((a, t) => a + t, 0) })
    return ultima
  })
}
