import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../shared/db/db'
import * as entriesRepo from './entriesRepo'
import * as foodsRepo from './foodsRepo'
import * as mealsRepo from './mealsRepo'
import type { ItemGuardado } from '../lib/alimentos'

const POLLO: foodsRepo.FoodInput = { nombre: 'Pollo', kcal100: 165, prot100: 31, carb100: 0, grasa100: 3.6, fuente: 'gemini', categoria: 'Carnes' }

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

describe('mealsRepo.crearDesdeItems', () => {
  it('guarda una sugerencia con sus snapshots y referencias sin registrar comida ni crear alimentos', async () => {
    const items = [{ nombre: 'Yogur', gramos: 125, kcal: 75, prot: 5, carb: 6, grasa: 2, catalogId: 'off:123', nutrientes: { sal: 0.12 }, platoId: 'bol', nombrePlato: 'Mi bol' }, { nombre: 'Avena', gramos: 40, kcal: 150, prot: 5, carb: 25, grasa: 3, foodId: 999, platoId: 'bol', nombrePlato: 'Mi bol' }]
    const id = await mealsRepo.crearDesdeItems({ nombre: '  Mi desayuno fijo  ', comida: 'desayuno', items })
    expect(await mealsRepo.obtener(id)).toMatchObject({ nombre: 'Mi desayuno fijo', comida: 'desayuno', items, usos: 0 })
    expect(await db.entries.count()).toBe(0)
    expect(await db.foods.count()).toBe(0)
    expect(await db.objetivosDia.count()).toBe(0)
    items[0]!.nutrientes!.sal = 9
    expect((await mealsRepo.obtener(id))!.items[0]!.nutrientes!.sal).toBe(0.12)
  })

  it('rechaza nombres y cantidades inválidas; admite registros rápidos sin gramos', async () => {
    const item = { nombre: 'Fuera de casa', gramos: 0, kcal: 500, prot: 20, carb: 30, grasa: 20 }
    await expect(mealsRepo.crearDesdeItems({ nombre: 'Vacía', items: [] })).rejects.toThrow()
    await expect(mealsRepo.crearDesdeItems({ nombre: 'Sin cantidad', items: [item] })).rejects.toThrow()
    await expect(mealsRepo.crearDesdeItems({ nombre: '', items: [{ ...item, rapida: true }] })).rejects.toThrow()
    const id = await mealsRepo.crearDesdeItems({ nombre: 'Comida fuera', items: [{ ...item, rapida: true }] })
    expect((await mealsRepo.obtener(id))!.items[0]!.rapida).toBe(true)
    expect(await db.meals.count()).toBe(1)
  })
})

describe('mealsRepo.crearDesdeRevision', () => {
  const pollo: ItemGuardado = { ...POLLO, gramos: 150, fuenteSiNuevo: 'manual', nutrientes: { fibra: 2, sal: 0.2 } }

  it('guarda referencias, cantidades y nutrientes sin registrar comidas ni objetivos diarios', async () => {
    const id = await mealsRepo.crearDesdeRevision({ nombre: '  Mi comida  ', comida: 'comida', items: [pollo, { ...pollo, nombre: 'Arroz de catálogo', catalogId: 'ciqual:1', gramos: 50 }] })
    const meal = (await mealsRepo.obtener(id))!
    expect(meal).toMatchObject({ nombre: 'Mi comida', comida: 'comida', usos: 0 })
    expect(meal.items[0]).toMatchObject({ foodId: expect.any(Number), gramos: 150, kcal: 247.5, nutrientes: { fibra: 3, sal: 0.3 } })
    expect(meal.items[0].catalogId).toBeUndefined()
    expect(meal.items[1]).toMatchObject({ catalogId: 'ciqual:1', gramos: 50, kcal: 82.5 })
    expect(meal.items[1].foodId).toBeUndefined()
    expect(meal.items[0].platoId).toBe(meal.items[1].platoId)
    expect(meal.items[0].nombrePlato).toBe('Mi comida')
    expect(await db.foods.count()).toBe(1)
    expect(await db.entries.count()).toBe(0)
    expect(await db.objetivosDia.count()).toBe(0)
    const ids = await mealsRepo.aplicar(id, { fecha: '2026-10-21', comida: 'cena' })
    expect(ids).toHaveLength(2)
    expect((await entriesRepo.delDia('2026-10-21')).map(e => e.kcal)).toEqual([247.5, 82.5])
  })

  it('revierte los alimentos y nombres personales si falla cualquier ingrediente', async () => {
    await expect(mealsRepo.crearDesdeRevision({ nombre: 'Mi comida', comida: 'comida', items: [{ ...pollo, nombreCorto: 'Pollo habitual' }, { ...pollo, nombre: 'Sin categoría', categoria: undefined }] })).rejects.toThrow(foodsRepo.CategoriaRequeridaError)
    expect(await db.meals.count()).toBe(0)
    expect(await db.foods.count()).toBe(0)
    expect(await db.nombresAlimentos.count()).toBe(0)
    expect(await db.entries.count()).toBe(0)
  })

  it('rechaza una plantilla sin nombre, vacía o con cantidades inválidas', async () => {
    for (const datos of [{ nombre: '', items: [pollo] }, { nombre: 'Vacía', items: [] }, { nombre: 'Sin cantidad', items: [{ ...pollo, gramos: 0 }] }]) {
      await expect(mealsRepo.crearDesdeRevision({ ...datos, comida: 'comida' })).rejects.toThrow()
    }
    expect(await db.meals.count()).toBe(0)
    expect(await db.foods.count()).toBe(0)
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
  it('aplicar una sugerencia conserva referencias, nutrientes y platos sin crear una plantilla', async () => {
    const items = [{ nombre: 'Yogur', gramos: 125, kcal: 75, prot: 5, carb: 6, grasa: 2, catalogId: 'off:123', nutrientes: { sal: 0.12 }, platoId: 'original', nombrePlato: 'Mi bol' }, { nombre: 'Avena', gramos: 40, kcal: 150, prot: 5, carb: 25, grasa: 3, foodId: 999, platoId: 'original', nombrePlato: 'Mi bol' }]
    const a = await mealsRepo.aplicarSugerencia(items, { fecha: '2026-10-21', comida: 'desayuno' })
    const b = await mealsRepo.aplicarSugerencia(items, { fecha: '2026-10-21', comida: 'desayuno' })
    const entries = (await db.entries.bulkGet([...a, ...b])).map(e => e!)
    expect(entries.map(e => e.kcal)).toEqual([75, 150, 75, 150])
    expect(entries[0]).toMatchObject({ catalogId: 'off:123', nutrientes: { sal: 0.12 }, nombrePlato: 'Mi bol' })
    expect(entries[0].platoId).toBe(entries[1].platoId)
    expect(entries[0].platoId).not.toBe(entries[2].platoId)
    expect(await db.meals.count()).toBe(0)
  })

  it('cada aplicación conserva sus platos y no se mezcla con las anteriores', async () => {
    const item = { nombre: 'Pollo', gramos: 100, kcal100: 165, prot100: 31, carb100: 0, grasa100: 3.6, fuenteSiNuevo: 'manual' as const, categoria: 'Otros' }
    await entriesRepo.guardarComida({ fecha: '2026-10-01', comida: 'cena', items: [item, { ...item, nombre: 'Arroz' }], nombrePlato: 'Plato A' })
    await entriesRepo.guardarComida({ fecha: '2026-10-01', comida: 'cena', items: [item, { ...item, nombre: 'Patatas' }], nombrePlato: 'Plato B' })
    const entries = await entriesRepo.delDia('2026-10-01')
    const id = await mealsRepo.crearDesdeEntradas({ nombre: 'Mi cena', entries })
    const destino = { fecha: '2026-10-02', comida: 'comida' as const }
    const primera = await mealsRepo.aplicar(id, destino)
    const segunda = await mealsRepo.aplicar(id, destino)
    const nuevos = (await db.entries.bulkGet([...primera, ...segunda])).map((e) => e!)
    expect(new Set(nuevos.map((e) => e.platoId)).size).toBe(4)
    for (let i = 0; i < nuevos.length; i += 2) expect(nuevos[i].platoId).toBe(nuevos[i + 1].platoId)
    expect(nuevos.map((e) => e.nombrePlato)).toEqual(['Plato A', 'Plato A', 'Plato B', 'Plato B', 'Plato A', 'Plato A', 'Plato B', 'Plato B'])
    expect((await mealsRepo.obtener(id))!.items.map((it) => it.platoId)).toEqual(entries.map((e) => e.platoId))
  })

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
