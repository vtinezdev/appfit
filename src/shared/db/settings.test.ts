import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { DEFAULT_MODELO, DEFAULT_OBJETIVOS, ensureSettings, getSettings, updateSettings } from './settings'
import type { Settings } from './types'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('getSettings', () => {
  it('sin registro devuelve los valores por defecto y no escribe (segura dentro de un liveQuery)', async () => {
    const s = await getSettings()
    expect(s).toEqual({ id: 1, apiKey: '', modelo: DEFAULT_MODELO, objetivos: DEFAULT_OBJETIVOS })
    expect(await db.settings.count()).toBe(0)
  })

  it('completa los campos que falten en un registro guardado con los valores por defecto', async () => {
    const incompleto = { id: 1, apiKey: 'k', modelo: 'm', objetivos: { kcal: 1800, prot: 140, carb: 180 } } as unknown as Settings
    await db.settings.put(incompleto)
    const s = await getSettings()
    expect(s.objetivos).toEqual({ kcal: 1800, prot: 140, carb: 180, grasa: DEFAULT_OBJETIVOS.grasa })
    expect(s.apiKey).toBe('k')
  })
})

describe('ensureSettings / updateSettings', () => {
  it('ensureSettings crea el registro una sola vez y no pisa uno existente', async () => {
    await ensureSettings()
    await updateSettings({ modelo: 'otro' })
    await ensureSettings()
    expect((await db.settings.get(1))?.modelo).toBe('otro')
  })
})
