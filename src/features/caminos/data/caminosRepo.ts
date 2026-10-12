// Caminos (campo `caminos` de `settings`): solo se guardan el inicio y las rutas elegidas; el resto se deriva.
import { db } from '../../../shared/db/db'
import { getSettings, updateSettings } from '../../../shared/db/settings'
import type { ConfigCaminos } from '../../../shared/db/types'

/** Guarda la configuración (o la quita con `undefined`) y devuelve la anterior, para deshacer. */
export function guardar(config: ConfigCaminos | undefined): Promise<ConfigCaminos | undefined> {
  return db.transaction('rw', db.settings, async () => {
    const antes = (await getSettings()).caminos
    await updateSettings({ caminos: config })
    return antes
  })
}
