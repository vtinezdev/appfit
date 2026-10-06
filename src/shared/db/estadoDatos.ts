import { db, TABLAS_USUARIO } from './db'
import { DEFAULT_OBJETIVOS, getSettings } from './settings'
import type { Objetivos } from './types'

/** Solo lectura: el catálogo y los ajustes por defecto no cuentan como registros introducidos por la persona. */
export function hayDatosGuardados(): Promise<boolean> {
  return db.transaction('r', TABLAS_USUARIO.map((t) => db.table(t)), async () => {
    const [cantidades, settings] = await Promise.all([
      Promise.all(TABLAS_USUARIO.filter((t) => t !== 'settings').map((t) => db.table(t).count())),
      getSettings(),
    ])
    const perfilIntroducido = Object.values(settings.perfil ?? {}).some((v) => v !== undefined)
    return cantidades.some((n) => n > 0) || perfilIntroducido ||
      (Object.keys(DEFAULT_OBJETIVOS) as (keyof Objetivos)[]).some((k) => settings.objetivos[k] !== DEFAULT_OBJETIVOS[k])
  })
}
