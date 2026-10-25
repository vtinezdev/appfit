import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../shared/db/db'
import { getSettings } from '../../../shared/db/settings'
import * as pausasRepo from './pausasRepo'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('pausasRepo', () => {
  it('pausa, reanuda, borra y deshace sobre settings', async () => {
    await pausasRepo.pausar({ desde: '2026-10-01', tipo: 'total', motivo: 'enfermedad' }, 'a')
    expect((await getSettings()).pausas).toEqual([{ id: 'a', desde: '2026-10-01', tipo: 'total', motivo: 'enfermedad' }])
    const antes = await pausasRepo.reanudar('a', '2026-10-10')
    expect((await getSettings()).pausas?.[0].hasta).toBe('2026-10-09')
    await pausasRepo.restaurar(antes)
    expect((await getSettings()).pausas?.[0].hasta).toBeUndefined()
    await pausasRepo.borrar('a')
    expect((await getSettings()).pausas).toBeUndefined()
  })

  it('rechaza una pausa que acaba antes de empezar', async () => {
    await expect(pausasRepo.pausar({ desde: '2026-10-10', hasta: '2026-10-01', tipo: 'total', motivo: 'otro' })).rejects.toThrow(pausasRepo.PausaInvalida)
  })
})
