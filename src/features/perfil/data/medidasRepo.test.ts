import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../shared/db/db'
import * as medidasRepo from './medidasRepo'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('medidasRepo', () => {
  it('registra por día y completa el mismo día sin duplicar', async () => {
    const id = await medidasRepo.registrar('2026-10-07', { cintura: 82.5 })
    expect(await medidasRepo.registrar('2026-10-07', { brazo: 36, cintura: 82 })).toBe(id)
    await medidasRepo.registrar('2026-10-01', { grasaPct: 19 })
    expect(await db.medidas.count()).toBe(2)
    expect((await medidasRepo.todas()).map((m) => m.fecha)).toEqual(['2026-10-07', '2026-10-01'])
    expect(await db.medidas.get(id)).toMatchObject({ cintura: 82, brazo: 36 })
  })

  it('rechaza valores inválidos y registros vacíos', async () => {
    await expect(medidasRepo.registrar('2026-10-07', { cintura: 5 })).rejects.toThrow(medidasRepo.MedidaInvalidaError)
    await expect(medidasRepo.registrar('2026-10-07', {})).rejects.toThrow(medidasRepo.MedidaInvalidaError)
    expect(await db.medidas.count()).toBe(0)
  })

  it('borrar devuelve el registro y restaurar lo repone; no pisa otro del mismo día', async () => {
    const id = await medidasRepo.registrar('2026-10-07', { cintura: 82 })
    const m = await medidasRepo.borrar(id)
    expect(await db.medidas.count()).toBe(0)
    await medidasRepo.restaurar(m!)
    expect(await db.medidas.get(id)).toEqual(m)
    await medidasRepo.borrar(id)
    await medidasRepo.registrar('2026-10-07', { cintura: 80 })
    await expect(medidasRepo.restaurar(m!)).rejects.toThrow()
    expect(await medidasRepo.borrar(999)).toBeUndefined()
  })
})
