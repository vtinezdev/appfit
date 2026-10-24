import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../shared/db/db'
import type { MealItem } from '../../../shared/db/types'
import * as planificadasRepo from './planificadasRepo'

const HOY = '2026-03-10'
const arroz: MealItem = { nombre: 'Arroz', gramos: 100, kcal: 130, prot: 2.7, carb: 28, grasa: 0.3, catalogId: 'ciqual:9100' }
const pollo: MealItem = { nombre: 'Pollo', gramos: 150, kcal: 165, prot: 31, carb: 0, grasa: 3.6 }

beforeEach(async () => {
  await Promise.all([db.planificadas.clear(), db.entries.clear(), db.foods.clear()])
})

describe('planificadasRepo', () => {
  it('planifica hoy y días futuros, nunca pasados, y no toca las entradas', async () => {
    const ids = await planificadasRepo.planificar([arroz, pollo], { fecha: '2026-03-12', comida: 'comida' }, HOY)
    expect(ids).toHaveLength(2)
    await planificadasRepo.planificar([arroz], { fecha: HOY, comida: 'cena' }, HOY)
    await expect(planificadasRepo.planificar([arroz], { fecha: '2026-03-09', comida: 'cena' }, HOY)).rejects.toBeInstanceOf(planificadasRepo.FechaNoPlanificable)
    expect(await db.entries.count()).toBe(0)
    expect((await planificadasRepo.todas()).map((p) => p.fecha)).toEqual([HOY, '2026-03-12', '2026-03-12'])
    expect(await planificadasRepo.entreFechas('2026-03-11', '2026-03-12')).toHaveLength(2)
  })

  it('usa el alimento actual del usuario, como al aplicar una plantilla', async () => {
    const foodId = await db.foods.add({ nombre: 'Avena', nombreNorm: 'avena', kcal100: 380, prot100: 13, carb100: 60, grasa100: 7, fuente: 'manual', updatedAt: 1 } as never)
    await planificadasRepo.planificar([{ foodId, nombre: 'Avena vieja', gramos: 50, kcal: 1, prot: 1, carb: 1, grasa: 1 }], { fecha: HOY, comida: 'desayuno' }, HOY)
    const [p] = await planificadasRepo.todas()
    expect(p.nombre).toBe('Avena')
    expect(p.kcal).toBe(190)
  })

  it('«Lo he comido» pasa solo esa comida a las entradas y se puede deshacer', async () => {
    await planificadasRepo.planificar([arroz, pollo], { fecha: HOY, comida: 'comida' }, HOY)
    await planificadasRepo.planificar([arroz], { fecha: HOY, comida: 'cena' }, HOY)
    const antes = await planificadasRepo.todas()
    const comido = await planificadasRepo.loHeComido(HOY, 'comida', HOY)
    expect(comido.entradas).toHaveLength(2)
    const entradas = await db.entries.toArray()
    expect(entradas.map((e) => [e.fecha, e.comida, e.nombre])).toEqual([[HOY, 'comida', 'Arroz'], [HOY, 'comida', 'Pollo']])
    expect(entradas[0].catalogId).toBe('ciqual:9100')
    expect((await planificadasRepo.todas()).map((p) => p.comida)).toEqual(['cena'])
    await planificadasRepo.deshacerComido(comido)
    expect(await db.entries.count()).toBe(0)
    expect(await planificadasRepo.todas()).toEqual(antes)
  })

  it('un día futuro no se puede comer todavía', async () => {
    await planificadasRepo.planificar([arroz], { fecha: '2026-03-11', comida: 'comida' }, HOY)
    expect((await planificadasRepo.loHeComido('2026-03-11', 'comida', HOY)).entradas).toEqual([])
    expect(await db.entries.count()).toBe(0)
    expect(await planificadasRepo.todas()).toHaveLength(1)
  })

  it('borrar devuelve las filas y restaurar las deja como estaban', async () => {
    const ids = await planificadasRepo.planificar([arroz, pollo], { fecha: HOY, comida: 'comida' }, HOY)
    const antes = await planificadasRepo.todas()
    const borradas = await planificadasRepo.borrar(ids)
    expect(borradas).toHaveLength(2)
    expect(await db.planificadas.count()).toBe(0)
    await planificadasRepo.restaurar(borradas)
    expect(await planificadasRepo.todas()).toEqual(antes)
  })
})
