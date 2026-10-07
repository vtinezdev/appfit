// Acceso a la tabla `medidas`: medidas corporales por día (`&fecha`). Las lecturas no escriben nunca.
import { db } from '../../../shared/db/db'
import type { Medida } from '../../../shared/db/types'
import { CAMPOS_MEDIDA, validarMedida, type CampoMedida } from '../lib/medidas'

export class MedidaInvalidaError extends Error {}

/** Todas las medidas, de la más reciente a la más antigua. */
export async function todas(): Promise<Medida[]> {
  return (await db.medidas.orderBy('fecha').toArray()).reverse()
}

/**
 * Registra las medidas de un día. Si ya había un registro ese día, los campos nuevos se suman a él y los repetidos se
 * sobrescriben (así se puede completar el día en dos veces).
 */
export async function registrar(fecha: string, valores: Partial<Record<CampoMedida, number>>): Promise<number> {
  const limpios: Partial<Record<CampoMedida, number>> = {}
  for (const { campo } of CAMPOS_MEDIDA) {
    const v = valores[campo]
    if (v === undefined) continue
    const ok = validarMedida(campo, v)
    if (ok === null) throw new MedidaInvalidaError('Alguna medida no es válida.')
    limpios[campo] = ok
  }
  if (Object.keys(limpios).length === 0) throw new MedidaInvalidaError('Rellena al menos una medida.')
  return db.transaction('rw', db.medidas, async () => {
    const existente = await db.medidas.where('fecha').equals(fecha).first()
    if (existente) {
      await db.medidas.update(existente.id, limpios)
      return existente.id
    }
    return db.medidas.add({ fecha, ...limpios })
  })
}

/** Borra el registro y lo devuelve, para poder deshacer con `restaurar`. */
export function borrar(id: number): Promise<Medida | undefined> {
  return db.transaction('rw', db.medidas, async () => {
    const m = await db.medidas.get(id)
    if (m) await db.medidas.delete(id)
    return m
  })
}

/** Repone un registro borrado con su mismo id; si ya hay otro de esa fecha, lanza. */
export function restaurar(m: Medida): Promise<void> {
  return db.transaction('rw', db.medidas, async () => {
    const delDia = await db.medidas.where('fecha').equals(m.fecha).first()
    if (delDia && delDia.id !== m.id) throw new MedidaInvalidaError('Ya hay un registro de ese día.')
    await db.medidas.put(m)
  })
}
