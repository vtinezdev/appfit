import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../shared/db/db'
import { getSettings } from '../../../shared/db/settings'
import * as ligaRepo from './ligaRepo'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('ligaRepo', () => {
  it('mantiene y vuelve a avisar sobre settings, sin duplicados', async () => {
    await ligaRepo.mantener(7)
    await ligaRepo.mantener(3)
    await ligaRepo.mantener(7)
    expect((await getSettings()).ligaMantener).toEqual([3, 7])
    await ligaRepo.volverAAvisar(7)
    expect((await getSettings()).ligaMantener).toEqual([3])
    await ligaRepo.volverAAvisar(3)
    expect((await getSettings()).ligaMantener).toBeUndefined()
  })
})
