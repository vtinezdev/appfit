import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../shared/db/db'
import { getSettings, updateSettings } from '../../../shared/db/settings'
import { diaCreatina } from '../lib/creatina'
import * as repo from './creatinaRepo'

beforeEach(async () => { await Promise.all(db.tables.map(t => t.clear())) })
describe('registro de creatina', () => {
  it('desactivada por defecto, lectura sin escrituras ni registros inferidos', async () => {
    const antes = await db.settings.toArray()
    expect(await repo.leer('2026-10-12')).toMatchObject({ config: undefined, tomada: false, historial: [] })
    expect(await db.settings.toArray()).toEqual(antes)
    await expect(repo.marcar('2026-10-12', true)).rejects.toThrow('desactivada')
  })
  it('marca idempotente, desmarca y no afecta a otros suplementos o días', async () => {
    await repo.configurar({ activa: true })
    await db.suplementos.add({ fecha: '2026-10-12', tipo: 'otro', createdAt: 1 })
    await Promise.all([repo.marcar('2026-10-12', true), repo.marcar('2026-10-12', true)])
    expect(await db.suplementos.where('[tipo+fecha]').equals(['creatina', '2026-10-12']).count()).toBe(1)
    await repo.marcar('2026-10-11', true)
    expect((await repo.leer('2026-10-12')).historial).toHaveLength(2)
    await repo.marcar('2026-10-12', false)
    expect((await repo.leer('2026-10-12')).tomada).toBe(false)
    expect((await repo.leer('2026-10-11')).tomada).toBe(true)
    expect(await db.suplementos.filter(t => t.tipo === 'otro').count()).toBe(1)
  })
  it('historial de siete días y último pesaje anterior o igual; ignora futuro', async () => {
    await repo.configurar({ activa: true })
    await db.pesos.bulkAdd([{ fecha: '2026-10-01', kg: 80, createdAt: 1 }, { fecha: '2026-10-13', kg: 110, createdAt: 2 }])
    for (const fecha of ['2026-10-05', '2026-10-06', '2026-10-12', '2026-10-13']) await repo.marcar(fecha, true)
    const leido = await repo.leer('2026-10-12')
    expect(leido.kg).toBe(80)
    expect(leido.historial.map(t => t.fecha)).toEqual(['2026-10-06', '2026-10-12'])
  })
  it('desactivar conserva tomas, dosis y otros ajustes; parches concurrentes no se pierden', async () => {
    await updateSettings({ barraKg: 15 })
    await Promise.all([repo.configurar({ activa: true }), repo.configurar({ dosisManualG: 4.5 })])
    await repo.marcar('2026-10-12', true)
    await repo.configurar({ activa: false })
    expect(await getSettings()).toMatchObject({ barraKg: 15, creatina: { activa: false, dosisManualG: 4.5 } })
    expect((await repo.leer('2026-10-12')).tomada).toBe(true)
    await repo.configurar({ dosisManualG: undefined })
    expect((await getSettings()).creatina).not.toHaveProperty('dosisManualG')
  })
  it('carga exige activación y pesaje; termina sin escrituras y cancelar conserva la marca', async () => {
    await repo.configurar({ activa: true })
    await expect(repo.empezarCarga('2026-10-12')).rejects.toThrow('peso')
    await db.pesos.add({ fecha: '2026-10-12', kg: 80, createdAt: 1 })
    await repo.empezarCarga('2026-10-12'); await repo.marcar('2026-10-12', true)
    const config = (await getSettings()).creatina
    expect(diaCreatina('2026-10-17', config, 80)).toMatchObject({ carga: false, dosisG: 4 })
    await repo.leer('2026-10-17')
    expect((await getSettings()).creatina).toEqual(config)
    await repo.configurar({ inicioCarga: undefined })
    expect((await getSettings()).creatina).not.toHaveProperty('inicioCarga')
    expect((await repo.leer('2026-10-12')).tomada).toBe(true)
  })
  it('validaciones y fallo de escritura conservan los datos y permiten reintentar', async () => {
    expect(() => repo.marcar('2026-02-30', true)).toThrow('Fecha')
    expect(() => repo.configurar({ dosisManualG: -1 })).toThrow('dosis')
    await repo.configurar({ activa: true })
    const fallo = vi.spyOn(db.suplementos, 'add').mockRejectedValueOnce(new Error('fallo'))
    await expect(repo.marcar('2026-10-12', true)).rejects.toThrow('fallo'); fallo.mockRestore()
    expect((await repo.leer('2026-10-12')).tomada).toBe(false)
    await repo.marcar('2026-10-12', true)
    const falloBorrar = vi.spyOn(db.suplementos, 'delete').mockRejectedValueOnce(new Error('fallo'))
    await expect(repo.marcar('2026-10-12', false)).rejects.toThrow('fallo'); falloBorrar.mockRestore()
    expect((await repo.leer('2026-10-12')).tomada).toBe(true)
  })
})
