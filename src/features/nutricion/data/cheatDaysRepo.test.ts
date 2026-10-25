import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../shared/db/db'
import * as cheatDaysRepo from './cheatDaysRepo'

beforeEach(async () => {
  await db.cheatDays.clear()
})

describe('cheatDaysRepo', () => {
  it('marcar es idempotente y las lecturas devuelven las fechas en orden', async () => {
    await cheatDaysRepo.marcar('2026-10-17')
    await Promise.all([cheatDaysRepo.marcar('2026-10-11'), cheatDaysRepo.marcar('2026-10-11')])
    expect(await db.cheatDays.count()).toBe(2)
    expect(await cheatDaysRepo.todas()).toEqual(['2026-10-11', '2026-10-17'])
    expect(await cheatDaysRepo.entreFechas('2026-10-12', '2026-10-18')).toEqual(['2026-10-17'])
  })
  it('quitar devuelve la marca y restaurar la deja como estaba', async () => {
    await cheatDaysRepo.marcar('2026-10-17')
    const antes = await db.cheatDays.toArray()
    const quitada = await cheatDaysRepo.quitar('2026-10-17')
    expect(quitada).toEqual(antes[0])
    expect(await cheatDaysRepo.quitar('2026-10-17')).toBeUndefined()
    await cheatDaysRepo.restaurar(quitada!)
    expect(await db.cheatDays.toArray()).toEqual(antes)
  })
  it('restaurar no duplica si el día se volvió a marcar', async () => {
    await cheatDaysRepo.marcar('2026-10-17')
    const quitada = await cheatDaysRepo.quitar('2026-10-17')
    await cheatDaysRepo.marcar('2026-10-17')
    await cheatDaysRepo.restaurar(quitada!)
    expect(await db.cheatDays.count()).toBe(1)
  })
})
