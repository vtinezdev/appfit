import { db } from './db'
import { ensureSettings } from './settings'

/** La apertura explícita permite reintentar después de que Dexie haya rechazado una apertura automática. */
export async function prepararDatos() {
  await db.open()
  await ensureSettings()
}
