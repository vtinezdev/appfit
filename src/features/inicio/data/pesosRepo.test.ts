import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../shared/db/db'
import * as pesosRepo from './pesosRepo'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('pesosRepo', () => {
  it('registrar guarda un pesaje por día: el mismo día sobrescribe', async () => {
    await pesosRepo.registrar('2026-09-30', 72)
    await pesosRepo.registrar('2026-09-30', 71.6)
    const todos = await db.pesos.toArray()
    expect(todos).toHaveLength(1)
    expect(todos[0]).toMatchObject({ fecha: '2026-09-30', kg: 71.6 })
  })

  it('delRango devuelve los pesajes del rango, ambos extremos incluidos y ordenados por fecha', async () => {
    for (const [f, kg] of [['2026-09-29', 72], ['2026-09-01', 75], ['2026-09-15', 73.5], ['2026-08-31', 76]] as const) await pesosRepo.registrar(f, kg)
    const r = await pesosRepo.delRango('2026-09-01', '2026-09-29')
    expect(r.map((p) => p.fecha)).toEqual(['2026-09-01', '2026-09-15', '2026-09-29'])
  })

  it('ultimoHasta devuelve el último pesaje ≤ fecha, sin escribir', async () => {
    for (const [f, kg] of [['2026-09-01', 75], ['2026-09-15', 73.5], ['2026-10-10', 70]] as const) await pesosRepo.registrar(f, kg)
    expect(await pesosRepo.ultimoHasta('2026-09-30')).toMatchObject({ fecha: '2026-09-15', kg: 73.5 })
    expect(await pesosRepo.ultimoHasta('2026-09-15')).toMatchObject({ fecha: '2026-09-15' })
    expect(await pesosRepo.ultimoHasta('2026-08-31')).toBeUndefined()
    expect(await db.pesos.count()).toBe(3)
  })
})
