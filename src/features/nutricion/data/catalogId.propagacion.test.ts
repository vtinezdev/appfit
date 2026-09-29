// `catalogId` debe sobrevivir a todo el ciclo de la referencia, pasando por los repos reales:
// Entry → copiar → plantilla (crear, editar gramos, aplicar) → Entry. Ninguna copia campo a campo puede perderlo.
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../shared/db/db'
import { itemConGramos } from '../lib/plantillas'
import * as entriesRepo from './entriesRepo'
import * as mealsRepo from './mealsRepo'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('propagación de catalogId por los repos', () => {
  it('copiar → plantilla → editar → aplicar conserva catalogId y no inventa foodId', async () => {
    const origen = await db.entries.add({
      fecha: '2026-09-29', comida: 'comida', catalogId: 'usda:1', nombre: 'Pollo', gramos: 100, kcal: 120, prot: 22, carb: 0, grasa: 2, createdAt: 1,
    })

    // copiar entrada
    const [copia] = await entriesRepo.copiar({ origen: { fecha: '2026-09-29', comida: 'comida' }, destino: { fecha: '2026-09-30' } })
    expect(await db.entries.get(copia)).toMatchObject({ catalogId: 'usda:1', fecha: '2026-09-30', kcal: 120 })
    expect((await db.entries.get(copia))?.foodId).toBeUndefined()

    // crear plantilla desde entradas
    const entradas = [(await db.entries.get(origen))!]
    const mealId = await mealsRepo.crearDesdeEntradas({ nombre: 'Pollo', entries: entradas })
    expect((await db.meals.get(mealId))?.items[0]).toMatchObject({ catalogId: 'usda:1', kcal: 120 })

    // editar gramos de un ítem y guardar (como hace GestionPlantillaSheet)
    const meal = (await db.meals.get(mealId))!
    const editado = itemConGramos(meal.items[0], { kcal100: 120, prot100: 22, carb100: 0, grasa100: 2 }, 200)
    await mealsRepo.actualizar(mealId, { items: [editado] })
    expect((await db.meals.get(mealId))?.items[0]).toMatchObject({ catalogId: 'usda:1', gramos: 200, kcal: 240 })

    // aplicar plantilla: la entrada nueva referencia el catálogo y usa el snapshot (no hay alimento de usuario)
    const [nueva] = await mealsRepo.aplicar(mealId, { fecha: '2026-10-01', comida: 'cena' })
    const e = (await db.entries.get(nueva))!
    expect(e).toMatchObject({ catalogId: 'usda:1', gramos: 200, kcal: 240, comida: 'cena' })
    expect(e.foodId).toBeUndefined()
  })
})
