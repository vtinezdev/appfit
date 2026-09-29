import { db } from './db'
import type { Objetivos, Settings } from './types'

export const DEFAULT_OBJETIVOS: Objetivos = { kcal: 2200, prot: 150, carb: 220, grasa: 70 }
export const DEFAULT_MODELO = 'gemini-3.8-flash'

/**
 * Completa un registro guardado con los valores por defecto. Así, los campos nuevos de `settings`
 * que se añadan en el futuro no necesitan un `upgrade()` de Dexie.
 */
export function conDefaults(s?: Partial<Settings>): Settings {
  return {
    apiKey: '',
    modelo: DEFAULT_MODELO,
    ...s,
    id: 1,
    objetivos: { ...DEFAULT_OBJETIVOS, ...s?.objetivos },
  }
}

/** Solo lectura: segura de usar dentro de un liveQuery. No escribe en la BD. */
export async function getSettings(): Promise<Settings> {
  return conDefaults(await db.settings.get(1))
}

/** Crea el registro de settings por defecto si todavía no existe. Llamar una vez al arrancar la app. */
export async function ensureSettings(): Promise<void> {
  const s = await db.settings.get(1)
  if (!s) {
    await db.settings.put(conDefaults())
  }
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<Settings> {
  const current = await getSettings()
  const next: Settings = { ...current, ...patch, id: 1 }
  await db.settings.put(next)
  return next
}
