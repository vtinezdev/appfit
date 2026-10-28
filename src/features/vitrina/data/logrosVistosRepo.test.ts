import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../shared/db/db'
import { getSettings, updateSettings } from '../../../shared/db/settings'
import { marcarVistos } from './logrosVistosRepo'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('logrosVistosRepo', () => {
  it('suma las claves a las ya vistas, sin repetir y sin tocar otros ajustes', async () => {
    await updateSettings({ pistasVistas: ['a'] })
    await marcarVistos(['racha:2', 'entrenos:1'])
    await marcarVistos(['entrenos:1', 'meta@2026-10-26#0'])
    const s = await getSettings()
    expect(s.logrosVistos).toEqual(['entrenos:1', 'meta@2026-10-26#0', 'racha:2'])
    expect(s.pistasVistas).toEqual(['a'])
  })
})
