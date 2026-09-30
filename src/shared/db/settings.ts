import { db } from './db'
import type { Objetivos, Settings } from './types'

/** Cuadran: 150·4 + 238·4 + 72·9 = 2200 kcal. */
export const DEFAULT_OBJETIVOS: Objetivos = { kcal: 2200, prot: 150, carb: 238, grasa: 72 }

/** Campos que tuvo `settings` y ya no se usan (la IA con Gemini se retiró). Pueden venir de la BD o de un backup antiguo. */
type SettingsGuardados = Partial<Settings> & { apiKey?: string; modelo?: string }

/**
 * Completa un registro guardado con los valores por defecto y descarta los campos antiguos. Así, los campos nuevos
 * de `settings` que se añadan en el futuro no necesitan un `upgrade()` de Dexie.
 */
export function conDefaults(s?: SettingsGuardados): Settings {
  const resto: SettingsGuardados = { ...s }
  delete resto.apiKey
  delete resto.modelo
  return {
    ...resto,
    id: 1,
    objetivos: { ...DEFAULT_OBJETIVOS, ...s?.objetivos },
  }
}

/** Solo lectura: segura de usar dentro de un liveQuery. No escribe en la BD. */
export async function getSettings(): Promise<Settings> {
  return conDefaults(await db.settings.get(1))
}

/**
 * Crea el registro de settings por defecto si todavía no existe, y borra del dispositivo los campos antiguos
 * (la API key de Gemini). Llamar una vez al arrancar la app.
 */
export async function ensureSettings(): Promise<void> {
  const s: SettingsGuardados | undefined = await db.settings.get(1)
  if (!s || s.apiKey !== undefined || s.modelo !== undefined) {
    await db.settings.put(conDefaults(s))
  }
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<Settings> {
  const current = await getSettings()
  const next: Settings = { ...current, ...patch, id: 1 }
  await db.settings.put(next)
  return next
}
