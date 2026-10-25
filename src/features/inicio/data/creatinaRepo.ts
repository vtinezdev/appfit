import { db } from '../../../shared/db/db'
import { getSettings } from '../../../shared/db/settings'
import type { ConfigCreatina } from '../../../shared/db/types'
import { addDays } from '../../../shared/lib/dates'
import { dosisManualValida, fechaCreatinaValida, pesoCreatinaValido } from '../lib/creatina'

const TIPO = 'creatina'
function validarFecha(fecha: string) { if (!fechaCreatinaValida(fecha)) throw new Error('Fecha no válida.') }

/** Consulta coherente y sin escrituras; el peso futuro no entra en la dosis de hoy. */
export function leer(fecha: string) {
  validarFecha(fecha)
  return db.transaction('r', db.settings, db.pesos, db.suplementos, async () => {
    const settings = await getSettings()
    const peso = await db.pesos.where('fecha').belowOrEqual(fecha).last()
    const historial = await db.suplementos.where('[tipo+fecha]').between([TIPO, addDays(fecha, -6)], [TIPO, fecha], true, true).toArray()
    return { config: settings.creatina, kg: peso?.kg, tomada: historial.some(t => t.fecha === fecha), historial }
  })
}

/** Parches transaccionales para no perder otros ajustes ni la dosis al activar/desactivar. */
export function configurar(cambio: Partial<ConfigCreatina>): Promise<void> {
  if (cambio.dosisManualG !== undefined && !dosisManualValida(cambio.dosisManualG)) throw new Error('Introduce una dosis mayor que 0 g.')
  if (cambio.inicioCarga !== undefined) throw new Error('Usa la acción de empezar la carga.')
  return db.transaction('rw', db.settings, async () => {
    const settings = await getSettings()
    const config = { activa: false, ...settings.creatina, ...cambio }
    if (config.dosisManualG === undefined) delete config.dosisManualG
    if (config.inicioCarga === undefined) delete config.inicioCarga
    await db.settings.put({ ...settings, creatina: config })
  })
}

export function empezarCarga(fecha: string): Promise<void> {
  validarFecha(fecha)
  return db.transaction('rw', db.settings, db.pesos, async () => {
    const settings = await getSettings()
    const peso = await db.pesos.where('fecha').belowOrEqual(fecha).last()
    if (!settings.creatina?.activa || !pesoCreatinaValido(peso?.kg)) throw new Error('Activa Creatina y registra un peso para calcular la carga.')
    await db.settings.put({ ...settings, creatina: { ...settings.creatina, inicioCarga: fecha } })
  })
}

/** Estado explícito e idempotente: no duplica la toma ante dos escrituras. */
export function marcar(fecha: string, tomada: boolean): Promise<void> {
  validarFecha(fecha)
  return db.transaction('rw', db.settings, db.suplementos, async () => {
    if (!(await getSettings()).creatina?.activa) throw new Error('Creatina está desactivada.')
    const existente = await db.suplementos.where('[tipo+fecha]').equals([TIPO, fecha]).first()
    if (!tomada && existente) await db.suplementos.delete(existente.id)
    else if (tomada && !existente) await db.suplementos.add({ fecha, tipo: TIPO, createdAt: Date.now() })
  })
}
