// Caminos (campos `caminos` y `zancadaCm` de `settings`): solo se guardan el inicio, las rutas elegidas y la zancada propia;
// el resto se deriva.
import { db } from '../../../shared/db/db'
import { getSettings, updateSettings } from '../../../shared/db/settings'
import type { ConfigCaminos } from '../../../shared/db/types'
import { ERROR_ZANCADA, validarZancada } from '../lib/pasos'

/** Guarda la configuración (o la quita con `undefined`) y devuelve la anterior, para deshacer. */
export function guardar(config: ConfigCaminos | undefined): Promise<ConfigCaminos | undefined> {
  return db.transaction('rw', db.settings, async () => {
    const antes = (await getSettings()).caminos
    await updateSettings({ caminos: config })
    return antes
  })
}

export class ZancadaInvalida extends Error {}

/** Guarda la zancada propia en cm (o vuelve a la estimada con `undefined`) y devuelve la anterior, para deshacer. */
export function guardarZancada(cm: number | undefined): Promise<number | undefined> {
  if (cm !== undefined && validarZancada(cm) === null) return Promise.reject(new ZancadaInvalida(ERROR_ZANCADA))
  return db.transaction('rw', db.settings, async () => {
    const antes = (await getSettings()).zancadaCm
    await updateSettings({ zancadaCm: cm })
    return antes
  })
}
