import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../shared/db/db'
import * as entriesRepo from './entriesRepo'
import * as foodsRepo from './foodsRepo'
import * as mealsRepo from './mealsRepo'

const POLLO: foodsRepo.FoodInput = { nombre: 'Pollo', kcal100: 165, prot100: 31, carb100: 0, grasa100: 3.6, fuente: 'gemini' }

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

async function crearComidaDePollo(gramos = 150) {
  const foodId = await foodsRepo.crear(POLLO)
  const entryId = (await entriesRepo.anadirDesdeAlimento({ fecha: '2026-09-28', comida: 'cena', foodId, gramos }))!
  const entries = await entriesRepo.delDia('2026-09-28')
  return { foodId, entryId, entries }
}

describe('mealsRepo.crearDesdeEntradas (A1)', () => {
  it('crea la plantilla con el snapshot de las entradas, usos=0 y usadoAt=createdAt', async () => {
    const { entries } = await crearComidaDePollo()
    const id = await mealsRepo.crearDesdeEntradas({ nombre: '  Mi cena  ', comida: 'cena', entries })
    const meal = await mealsRepo.obtener(id)
    expect(meal).toMatchObject({ nombre: 'Mi cena', comida: 'cena', usos: 0 })
    expect(meal!.usadoAt).toBe(meal!.createdAt)
    expect(meal!.items).toEqual([{ foodId: expect.any(Number), nombre: 'Pollo', gramos: 150, kcal: 247.5, prot: 46.5, carb: 0, grasa: 5.4, rapida: undefined }])
  })

  it('no comparte referencias con las entradas originales: mutar la entrada de origen no cambia la plantilla guardada', async () => {
    const { entries, entryId } = await crearComidaDePollo()
    const id = await mealsRepo.crearDesdeEntradas({ nombre: 'Mi cena', comida: 'cena', entries })
    entries[0].nombre = 'Mutado en memoria'
    await db.entries.update(entryId, { nombre: 'Mutado en la base de datos' })
    const meal = await mealsRepo.obtener(id)
    expect(meal!.items[0].nombre).toBe('Pollo')
  })

  it('listar ordena por usadoAt descendente', async () => {
    const { entries } = await crearComidaDePollo()
    const a = await mealsRepo.crearDesdeEntradas({ nombre: 'A', entries })
    const b = await mealsRepo.crearDesdeEntradas({ nombre: 'B', entries })
    await db.meals.update(a, { usadoAt: 1 })
    await db.meals.update(b, { usadoAt: 2 })
    expect((await mealsRepo.listar()).map((m) => m.id)).toEqual([b, a])
  })
})

describe('mealsRepo.actualizar / borrar (gestión en Alimentos)', () => {
  it('actualizar renombra y/o reemplaza los ítems', async () => {
    const { entries } = await crearComidaDePollo()
    const id = await mealsRepo.crearDesdeEntradas({ nombre: 'Mi cena', entries })
    await mealsRepo.actualizar(id, { nombre: 'Cena ligera' })
    expect((await mealsRepo.obtener(id))?.nombre).toBe('Cena ligera')
    await mealsRepo.actualizar(id, { items: [] })
    expect((await mealsRepo.obtener(id))?.items).toEqual([])
  })

  it('borrar elimina la plantilla', async () => {
    const { entries } = await crearComidaDePollo()
    const id = await mealsRepo.crearDesdeEntradas({ nombre: 'Mi cena', entries })
    await mealsRepo.borrar(id)
    expect(await mealsRepo.obtener(id)).toBeUndefined()
  })
})

describe('mealsRepo.aplicar (A1)', () => {
  it('usa los valores actuales del alimento (no el snapshot) al aplicar', async () => {
    const { foodId, entries } = await crearComidaDePollo(100)
    const id = await mealsRepo.crearDesdeEntradas({ nombre: 'Mi cena', entries })
    await foodsRepo.actualizar(foodId, { ...POLLO, kcal100: 120, prot100: 25 })
    const ids = await mealsRepo.aplicar(id, { fecha: '2026-09-29', comida: 'comida' })
    const nueva = await db.entries.get(ids[0])
    expect(nueva).toMatchObject({ fecha: '2026-09-29', comida: 'comida', kcal: 120, prot: 25 })
  })

  it('aceptación: cambiar las kcal de un alimento hace que la siguiente aplicación use el valor nuevo', async () => {
    const { foodId, entries } = await crearComidaDePollo(100)
    const id = await mealsRepo.crearDesdeEntradas({ nombre: 'Mi cena', entries })
    const primera = await mealsRepo.aplicar(id, { fecha: '2026-09-29', comida: 'comida' })
    expect((await db.entries.get(primera[0]))?.kcal).toBe(165)
    await foodsRepo.actualizar(foodId, { ...POLLO, kcal100: 200 })
    const segunda = await mealsRepo.aplicar(id, { fecha: '2026-09-30', comida: 'comida' })
    expect((await db.entries.get(segunda[0]))?.kcal).toBe(200)
  })

  it('usa el snapshot si el alimento se borró', async () => {
    const { foodId, entries } = await crearComidaDePollo(100)
    const id = await mealsRepo.crearDesdeEntradas({ nombre: 'Mi cena', entries })
    await foodsRepo.borrar(foodId)
    const ids = await mealsRepo.aplicar(id, { fecha: '2026-09-29', comida: 'comida' })
    expect(await db.entries.get(ids[0])).toMatchObject({ nombre: 'Pollo', kcal: 165, prot: 31 })
  })

  it('conserva el snapshot y la marca «rápida» de un ítem sin alimento', async () => {
    await entriesRepo.anadirRapida({ fecha: '2026-09-28', comida: 'snack', nombre: 'Pizza fuera', kcal: 900, prot: 40, carb: 0, grasa: 0 })
    const entries = await entriesRepo.delDia('2026-09-28')
    const id = await mealsRepo.crearDesdeEntradas({ nombre: 'Antojo', entries })
    const ids = await mealsRepo.aplicar(id, { fecha: '2026-09-29', comida: 'snack' })
    expect(await db.entries.get(ids[0])).toMatchObject({ nombre: 'Pizza fuera', gramos: 0, kcal: 900, rapida: true })
  })

  it('incrementa usos y actualiza usadoAt', async () => {
    const { entries } = await crearComidaDePollo()
    const id = await mealsRepo.crearDesdeEntradas({ nombre: 'Mi cena', entries })
    const antes = (await mealsRepo.obtener(id))!
    await mealsRepo.aplicar(id, { fecha: '2026-09-29', comida: 'comida' })
    const despues = (await mealsRepo.obtener(id))!
    expect(despues.usos).toBe(antes.usos + 1)
    expect(despues.usadoAt).toBeGreaterThanOrEqual(antes.usadoAt)
  })

  it('no comparte referencias con los ítems de la plantilla al aplicar', async () => {
    const { entries } = await crearComidaDePollo()
    const id = await mealsRepo.crearDesdeEntradas({ nombre: 'Mi cena', entries })
    const ids = await mealsRepo.aplicar(id, { fecha: '2026-09-29', comida: 'comida' })
    await db.entries.update(ids[0], { nombre: 'Mutada tras aplicar' })
    expect((await mealsRepo.obtener(id))!.items[0].nombre).toBe('Pollo')
  })

  it('una plantilla sin ítems no crea entradas ni incrementa usos', async () => {
    const { entries } = await crearComidaDePollo()
    const id = await mealsRepo.crearDesdeEntradas({ nombre: 'Vacía', entries })
    await mealsRepo.actualizar(id, { items: [] })
    const ids = await mealsRepo.aplicar(id, { fecha: '2026-09-29', comida: 'comida' })
    expect(ids).toEqual([])
    expect((await mealsRepo.obtener(id))!.usos).toBe(0)
  })

  it('una plantilla que no existe no hace nada', async () => {
    expect(await mealsRepo.aplicar(999, { fecha: '2026-09-29', comida: 'comida' })).toEqual([])
  })

  it('es atómico: si falla la inserción antes de tocar la plantilla, no queda nada a medias', async () => {
    const { entries } = await crearComidaDePollo()
    const id = await mealsRepo.crearDesdeEntradas({ nombre: 'Mi cena', entries })
    const spy = vi.spyOn(db.entries, 'bulkAdd').mockImplementationOnce(() => Promise.reject(new Error('fallo simulado')) as never)
    await expect(mealsRepo.aplicar(id, { fecha: '2026-09-29', comida: 'comida' })).rejects.toThrow('fallo simulado')
    spy.mockRestore()
    expect(await entriesRepo.delDia('2026-09-29')).toEqual([])
    expect((await mealsRepo.obtener(id))!.usos).toBe(0)
  })

  it('es atómico de verdad: si bulkAdd llega a insertar las entradas pero falla actualizar usos/usadoAt, la transacción revierte también las entradas ya insertadas', async () => {
    const { entries } = await crearComidaDePollo()
    const id = await mealsRepo.crearDesdeEntradas({ nombre: 'Mi cena', entries })
    const antes = (await mealsRepo.obtener(id))!

    const spy = vi.spyOn(db.meals, 'update').mockImplementationOnce(() => Promise.reject(new Error('fallo simulado')) as never)
    await expect(mealsRepo.aplicar(id, { fecha: '2026-09-29', comida: 'comida' })).rejects.toThrow('fallo simulado')
    spy.mockRestore()

    // bulkAdd sí llegó a ejecutarse (meals.update es posterior en aplicar): si el rollback de Dexie
    // no revirtiera la transacción entera, estas entradas seguirían en la base de datos.
    expect(await entriesRepo.delDia('2026-09-29')).toEqual([])
    const despues = (await mealsRepo.obtener(id))!
    expect(despues.usos).toBe(antes.usos)
    expect(despues.usadoAt).toBe(antes.usadoAt)
  })
})
