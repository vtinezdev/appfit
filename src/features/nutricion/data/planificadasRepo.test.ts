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
    await planificadasRepo.planificar([arroz], { fecha: '2026-06-01', comida: 'cena' }, HOY)
    await db.planificadas.where('fecha').equals('2026-06-01').delete()
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

  it('planifica lo revisado sin tocar el diario: crea el alimento propio, referencia el catálogo y agrupa el plato', async () => {
    const ids = await planificadasRepo.planificarRevision({ fecha: '2026-03-20', comida: 'cena', nombrePlato: 'Merluza con patata', items: [
      { nombre: 'Merluza', gramos: 200, kcal100: 90, prot100: 18, carb100: 0, grasa100: 1.5, fuenteSiNuevo: 'manual', categoria: 'Pescados' },
      { nombre: 'Patata cocida', gramos: 250, kcal100: 86, prot100: 2, carb100: 18, grasa100: 0.1, fuenteSiNuevo: 'manual', catalogId: 'ciqual:4003' },
    ] }, HOY)
    expect(ids).toHaveLength(2)
    expect(await db.entries.count()).toBe(0)
    const filas = await planificadasRepo.delDia('2026-03-20')
    expect(filas.map((f) => [f.nombre, f.kcal, f.nombrePlato])).toEqual([['Merluza', 180, 'Merluza con patata'], ['Patata cocida', 215, 'Merluza con patata']])
    expect(filas[0].foodId).toBe((await db.foods.toArray())[0].id)
    expect(filas[1].catalogId).toBe('ciqual:4003')
    expect(filas[0].platoId).toBe(filas[1].platoId)
    await expect(planificadasRepo.planificarRevision({ fecha: '2026-03-09', comida: 'cena', items: [] }, HOY)).rejects.toBeInstanceOf(planificadasRepo.FechaNoPlanificable)
  })

  it('planifica un alimento con sus valores actuales y unas kcal rápidas', async () => {
    const foodId = await db.foods.add({ nombre: 'Yogur', nombreNorm: 'yogur', kcal100: 60, prot100: 4, carb100: 5, grasa100: 3, fuente: 'manual', updatedAt: 1 } as never)
    expect(await planificadasRepo.planificarAlimento({ fecha: HOY, comida: 'snack', ref: { tipo: 'user', id: foodId }, gramos: 125 }, HOY)).toBeDefined()
    expect(await planificadasRepo.planificarAlimento({ fecha: HOY, comida: 'snack', ref: { tipo: 'user', id: 999 }, gramos: 125 }, HOY)).toBeUndefined()
    await planificadasRepo.planificarRapida({ fecha: HOY, comida: 'cena', nombre: 'Cena fuera', kcal: 800, prot: 30, carb: 80, grasa: 35 }, HOY)
    const filas = await planificadasRepo.delDia(HOY)
    expect(filas.map((f) => [f.nombre, f.gramos, f.kcal, f.rapida ?? false])).toEqual([['Yogur', 125, 75, false], ['Cena fuera', 0, 800, true]])
    expect(await db.entries.count()).toBe(0)
  })

  it('guarda y vacía lo marcado en la lista de la compra', async () => {
    await planificadasRepo.guardarMarcasCompra(['user:1', 'catalog:ciqual:1'])
    expect(await planificadasRepo.marcasCompra()).toEqual(['user:1', 'catalog:ciqual:1'])
    await planificadasRepo.guardarMarcasCompra([])
    expect(await planificadasRepo.marcasCompra()).toEqual([])
  })

  it('dos marcas simultáneas conservan ambos artículos y el resto de ajustes', async () => {
    const { updateSettings, getSettings } = await import('../../../shared/db/settings')
    await updateSettings({ aguaObjetivoMl: 2500, compraMarcada: undefined })
    await Promise.all([planificadasRepo.alternarMarcaCompra('user:1'), planificadasRepo.alternarMarcaCompra('user:2')])
    expect((await planificadasRepo.marcasCompra()).sort()).toEqual(['user:1', 'user:2'])
    expect((await getSettings()).aguaObjetivoMl).toBe(2500)
    await Promise.all([planificadasRepo.alternarMarcaCompra('user:1'), planificadasRepo.alternarMarcaCompra('user:1')])
    expect((await planificadasRepo.marcasCompra()).sort()).toEqual(['user:1', 'user:2'])
  })

  it('desmarcar una lista no borra marcas concurrentes de otros artículos', async () => {
    await planificadasRepo.guardarMarcasCompra(['user:1'])
    await Promise.all([planificadasRepo.alternarMarcaCompra('user:2'), planificadasRepo.desmarcarCompra(['user:1'])])
    expect(await planificadasRepo.marcasCompra()).toEqual(['user:2'])
  })
})
