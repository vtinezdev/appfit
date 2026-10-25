import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../shared/db/db'
import * as aguaRepo from './aguaRepo'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('aguaRepo', () => {
  it('suma tomas en una sola fila por día', async () => {
    expect(await aguaRepo.anadir('2026-10-07', 250)).toBe(250)
    expect(await aguaRepo.anadir('2026-10-07', 500)).toBe(750)
    expect(await db.agua.count()).toBe(1)
    expect(await aguaRepo.delDia('2026-10-07')).toMatchObject({ ml: 750, tomas: [250, 500] })
    expect(await aguaRepo.delDia('2026-10-06')).toBeUndefined()
  })

  it('quita la última toma; a cero borra la fila', async () => {
    await aguaRepo.anadir('2026-10-07', 250)
    await aguaRepo.anadir('2026-10-07', 330)
    expect(await aguaRepo.quitarUltima('2026-10-07')).toBe(330)
    expect(await aguaRepo.delDia('2026-10-07')).toMatchObject({ ml: 250 })
    expect(await aguaRepo.quitarUltima('2026-10-07')).toBe(250)
    expect(await db.agua.count()).toBe(0)
    expect(await aguaRepo.quitarUltima('2026-10-07')).toBeUndefined()
  })

  it('rechaza tomas inválidas y trata filas importadas sin detalle', async () => {
    expect(() => aguaRepo.anadir('2026-10-07', 0)).toThrow(aguaRepo.TomaAguaInvalidaError)
    await db.agua.add({ fecha: '2026-10-05', ml: 1200 })
    expect(await aguaRepo.anadir('2026-10-05', 250)).toBe(1450)
    expect(await aguaRepo.quitarUltima('2026-10-05')).toBe(250)
    expect(await aguaRepo.delDia('2026-10-05')).toMatchObject({ ml: 1200 })
  })

  it('entreFechas devuelve el rango pedido', async () => {
    for (const f of ['2026-10-01', '2026-10-03', '2026-10-09']) await aguaRepo.anadir(f, 250)
    expect((await aguaRepo.entreFechas('2026-10-02', '2026-10-08')).map((a) => a.fecha)).toEqual(['2026-10-03'])
  })
})
