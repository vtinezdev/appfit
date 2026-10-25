import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../shared/db/db'
import * as porcionesRepo from './porcionesRepo'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('porcionesRepo', () => {
  it('crea, lista por alimento y valida', async () => {
    await porcionesRepo.crear('user:1', 'Rebanada', 32)
    await porcionesRepo.crear('user:1', 'bol', 250)
    await porcionesRepo.crear('catalog:ciqual:5', 'rebanada', 25)
    expect((await porcionesRepo.delAlimento('user:1')).map((p) => p.nombreNorm)).toEqual(['bol', 'rebanada'])
    expect(await porcionesRepo.todas()).toHaveLength(3)
    await expect(porcionesRepo.crear('user:1', 'dos palabras', 10)).rejects.toThrow(porcionesRepo.PorcionInvalidaError)
    await expect(porcionesRepo.crear('user:1', 'REBANADA', 10)).rejects.toThrow(/ya tiene/)
  })

  it('actualiza sin chocar consigo misma y rechaza duplicados', async () => {
    const a = await porcionesRepo.crear('user:1', 'bol', 250)
    await porcionesRepo.crear('user:1', 'taza', 200)
    await porcionesRepo.actualizar(a, 'Bol', 300)
    expect(await db.porciones.get(a)).toMatchObject({ nombre: 'Bol', gramos: 300 })
    await expect(porcionesRepo.actualizar(a, 'taza', 300)).rejects.toThrow(/ya tiene/)
  })

  it('borrar devuelve la ración y restaurar la repone con el mismo id', async () => {
    const id = await porcionesRepo.crear('user:1', 'bol', 250)
    const p = await porcionesRepo.borrar(id)
    expect(await db.porciones.count()).toBe(0)
    await porcionesRepo.restaurar(p!)
    expect(await db.porciones.get(id)).toEqual(p)
    await porcionesRepo.borrar(id)
    await porcionesRepo.crear('user:1', 'bol', 100)
    await expect(porcionesRepo.restaurar(p!)).rejects.toThrow()
    expect(await porcionesRepo.borrar(999)).toBeUndefined()
  })
})

describe('refDeItem', () => {
  it('resuelve alimentos propios por nombre y los del catálogo por id', async () => {
    const id = await db.foods.add({ nombre: 'Pan Bimbo', nombreNorm: 'pan bimbo', kcal100: 1, prot100: 1, carb100: 1, grasa100: 1, fuente: 'manual', updatedAt: 1 })
    expect(await porcionesRepo.refDeItem({ guardado: true, nombreNorm: 'pan bimbo' })).toBe(`user:${id}`)
    expect(await porcionesRepo.refDeItem({ guardado: true, nombreNorm: 'no existe' })).toBeUndefined()
    expect(await porcionesRepo.refDeItem({ guardado: false, nombreNorm: 'x' })).toBeUndefined()
    expect(await porcionesRepo.refDeItem({ guardado: false, nombreNorm: 'x', catalogId: 'ciqual:7' })).toBe('catalog:ciqual:7')
  })
})
