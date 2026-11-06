import { beforeEach, describe, expect, it } from 'vitest'
import { todayISO } from '../lib/dates'
import { db } from './db'
import { DEFAULT_OBJETIVOS, ensureSettings, getSettings, updateSettings } from './settings'
import type { Settings } from './types'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('getSettings', () => {
  it('sin registro devuelve los valores por defecto y no escribe (segura dentro de un liveQuery)', async () => {
    const s = await getSettings()
    expect(s).toEqual({ id: 1, objetivos: DEFAULT_OBJETIVOS })
    expect(await db.settings.count()).toBe(0)
  })

  it('completa los campos que falten en un registro guardado con los valores por defecto', async () => {
    const incompleto = { id: 1, objetivos: { kcal: 1800, prot: 140, carb: 180 } } as unknown as Settings
    await db.settings.put(incompleto)
    const s = await getSettings()
    expect(s.objetivos).toEqual({ kcal: 1800, prot: 140, carb: 180, grasa: DEFAULT_OBJETIVOS.grasa })
  })

  it('descarta los campos antiguos de la IA (API key y modelo)', async () => {
    await db.settings.put({ id: 1, apiKey: 'k', modelo: 'm', objetivos: DEFAULT_OBJETIVOS } as unknown as Settings)
    expect(await getSettings()).toEqual({ id: 1, objetivos: DEFAULT_OBJETIVOS })
  })
})

describe('ensureSettings / updateSettings', () => {
  it('ensureSettings crea el registro una sola vez y no pisa uno existente', async () => {
    await ensureSettings()
    const objetivos = { kcal: 1800, prot: 140, carb: 180, grasa: 60 }
    await updateSettings({ objetivos })
    await ensureSettings()
    expect((await db.settings.get(1))?.objetivos).toEqual(objetivos)
  })

  it('en una instalación nueva marca la bienvenida y la falta de objetivos; en una existente, nada', async () => {
    await ensureSettings()
    expect(await db.settings.get(1)).toEqual({ id: 1, objetivos: DEFAULT_OBJETIVOS, sinObjetivos: true, bienvenidaPendiente: true, primeraApertura: todayISO() })
    const existente = { id: 1, objetivos: { kcal: 1800, prot: 140, carb: 180, grasa: 60 }, primeraApertura: '2026-01-05' }
    await db.settings.put(existente)
    await ensureSettings()
    expect(await db.settings.get(1)).toEqual(existente)
  })

  it('ensureSettings borra del dispositivo la API key antigua y conserva lo demás', async () => {
    const objetivos = { kcal: 1800, prot: 140, carb: 180, grasa: 60 }
    await db.settings.put({ id: 1, apiKey: 'secreta', modelo: 'm', objetivos } as unknown as Settings)
    await ensureSettings()
    expect(await db.settings.get(1)).toEqual({ id: 1, objetivos, primeraApertura: todayISO() })
  })

  it('una instalación de antes del ADR 068 apunta hoy como primera apertura, una sola vez, sin tocar lo demás', async () => {
    const objetivos = { kcal: 1800, prot: 140, carb: 180, grasa: 60 }
    await db.settings.put({ id: 1, objetivos, barraKg: 15 })
    await ensureSettings()
    expect(await db.settings.get(1)).toEqual({ id: 1, objetivos, barraKg: 15, primeraApertura: todayISO() })
    await db.settings.update(1, { primeraApertura: '2026-02-01' })
    await ensureSettings()
    expect((await db.settings.get(1))?.primeraApertura).toBe('2026-02-01')
  })

  it('updateSettings es transaccional: dos parches concurrentes no se pisan', async () => {
    await ensureSettings()
    const objetivos = { kcal: 1800, prot: 140, carb: 180, grasa: 60 }
    await Promise.all([updateSettings({ objetivos }), updateSettings({ perfil: { sexo: 'mujer' } })])
    const s = await getSettings()
    expect(s.objetivos).toEqual(objetivos)
    expect(s.perfil).toEqual({ sexo: 'mujer' })
  })

  it('un parche con perfil undefined elimina el campo', async () => {
    await updateSettings({ perfil: { sexo: 'mujer' } })
    await updateSettings({ perfil: undefined })
    expect(await db.settings.get(1)).not.toHaveProperty('perfil')
  })
})
