// Piezas de la Vitrina ya celebradas (campo `logrosVistos` de `settings`). Lee y escribe en la misma transacción, como
// `updateSettings`, para no pisar otra marca hecha a la vez.
import { db } from '../../../shared/db/db'
import { getSettings, updateSettings } from '../../../shared/db/settings'

/** Añade las claves (`lib/logros.piezasConseguidas`) a las ya celebradas, sin repetir y en orden. */
export function marcarVistos(claves: readonly string[]): Promise<void> {
  return db.transaction('rw', db.settings, async () => {
    const vistos = new Set((await getSettings()).logrosVistos ?? [])
    for (const c of claves) vistos.add(c)
    await updateSettings({ logrosVistos: [...vistos].sort() })
  })
}
