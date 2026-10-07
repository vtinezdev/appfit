import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../shared/db/db'
import type { MealItem } from '../../../shared/db/types'
import * as entriesRepo from './entriesRepo'
import * as foodsRepo from './foodsRepo'
import * as recetasRepo from './recetasRepo'

const arroz: MealItem = { nombre: 'Arroz', gramos: 200, kcal: 700, prot: 14, carb: 156, grasa: 2 }
const pollo: MealItem = { nombre: 'Pollo', gramos: 300, kcal: 330, prot: 69, carb: 0, grasa: 4 }

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('recetasRepo', () => {
  it('crear guarda la receta y un alimento propio con los valores por 100 g cocinado', async () => {
    const id = await recetasRepo.crear({ nombre: 'Arroz con pollo', ingredientes: [arroz, pollo], pesoCocinadoG: 800 })
    const receta = (await recetasRepo.obtener(id))!
    const food = (await db.foods.get(receta.foodId))!
    expect(food).toMatchObject({ nombre: 'Arroz con pollo', nombreNorm: 'arroz con pollo', fuente: 'manual', kcal100: 128.8, prot100: 10.4 })
  })

  it('el alimento de la receta se puede usar en una entrada como cualquier otro', async () => {
    const id = await recetasRepo.crear({ nombre: 'Guiso', ingredientes: [arroz, pollo], pesoCocinadoG: 1000 })
    const { foodId } = (await recetasRepo.obtener(id))!
    const entryId = await entriesRepo.anadirDesdeAlimento({ fecha: '2026-10-07', comida: 'comida', foodId, gramos: 250 })
    expect(await db.entries.get(entryId!)).toMatchObject({ foodId, gramos: 250, kcal: 257.5 })
  })

  it('un nombre ya usado por un alimento es un error, y no deja nada a medias', async () => {
    await foodsRepo.crear({ nombre: 'Guiso', kcal100: 1, prot100: 1, carb100: 1, grasa100: 1, fuente: 'manual' })
    await expect(recetasRepo.crear({ nombre: 'guiso', ingredientes: [arroz], pesoCocinadoG: 200 })).rejects.toThrow(foodsRepo.NombreDuplicadoError)
    expect(await db.recetas.count()).toBe(0)
    expect(await db.foods.count()).toBe(1)
  })

  it('actualizar cambia el alimento y no toca las entradas antiguas', async () => {
    const id = await recetasRepo.crear({ nombre: 'Guiso', ingredientes: [arroz, pollo], pesoCocinadoG: 1000 })
    const { foodId } = (await recetasRepo.obtener(id))!
    const entryId = await entriesRepo.anadirDesdeAlimento({ fecha: '2026-10-07', comida: 'comida', foodId, gramos: 100 })
    const antes = await db.entries.get(entryId!)
    await recetasRepo.actualizar(id, { nombre: 'Guiso de la abuela', ingredientes: [arroz], pesoCocinadoG: 400 })
    expect(await db.foods.get(foodId)).toMatchObject({ nombre: 'Guiso de la abuela', kcal100: 175 })
    expect(await db.foods.count()).toBe(1)
    expect(await db.entries.get(entryId!)).toEqual(antes)
    await expect(recetasRepo.actualizar(id, { nombre: 'Guiso de la abuela', ingredientes: [], pesoCocinadoG: 400 })).rejects.toThrow(recetasRepo.RecetaInvalidaError)
  })

  it('actualizar recrea el alimento si se borró', async () => {
    const id = await recetasRepo.crear({ nombre: 'Guiso', ingredientes: [arroz], pesoCocinadoG: 400 })
    const { foodId } = (await recetasRepo.obtener(id))!
    await foodsRepo.borrar(foodId)
    await recetasRepo.actualizar(id, { nombre: 'Guiso', ingredientes: [arroz], pesoCocinadoG: 400 })
    const receta = (await recetasRepo.obtener(id))!
    expect(await db.foods.get(receta.foodId)).toMatchObject({ nombre: 'Guiso' })
  })

  it('borrar conserva o borra el alimento asociado', async () => {
    const a = await recetasRepo.crear({ nombre: 'A', ingredientes: [arroz], pesoCocinadoG: 200 })
    const b = await recetasRepo.crear({ nombre: 'B', ingredientes: [arroz], pesoCocinadoG: 200 })
    await recetasRepo.borrar(a, true)
    await recetasRepo.borrar(b, false)
    expect(await db.recetas.count()).toBe(0)
    expect((await db.foods.toArray()).map((f) => f.nombre)).toEqual(['A'])
  })
})
