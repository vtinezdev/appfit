// Cumbres (campo `cumbres` de `settings`): solo se guardan el inicio y las montañas elegidas; el resto se deriva.
import { db } from '../../../shared/db/db'
import { getSettings, updateSettings } from '../../../shared/db/settings'
import type { ConfigCumbres } from '../../../shared/db/types'

/** Guarda la configuración (o la quita con `undefined`) y devuelve la anterior, para deshacer. */
export function guardar(config: ConfigCumbres | undefined): Promise<ConfigCumbres | undefined> {
  return db.transaction('rw', db.settings, async () => {
    const antes = (await getSettings()).cumbres
    await updateSettings({ cumbres: config })
    return antes
  })
}
