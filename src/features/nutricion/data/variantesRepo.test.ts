import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../shared/db/db'
import type { CatalogFood, MealItem } from '../../../shared/db/types'
import * as foodsRepo from './foodsRepo'
import * as recetasRepo from './recetasRepo'
import * as variantesRepo from './variantesRepo'

const arroz: MealItem = { nombre: 'Arroz', gramos: 200, kcal: 700, prot: 14, carb: 156, grasa: 2 }
const pollo: MealItem = { nombre: 'Pollo', gramos: 300, kcal: 330, prot: 69, carb: 0, grasa: 4 }

const catalogo = (id: string, nombre: string, extra: Partial<CatalogFood> = {}): CatalogFood => ({
  id, fuente: id.split(':')[0], idExterno: id.split(':')[1], nombre, nombreNorm: nombre.toLowerCase(), tok: [], tipo: 'generico', kcal100: 330, prot100: 24, carb100: 50, grasa100: 1.5, version: 'v', importadoAt: 0, ...extra,
})

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('recetas al añadir comida', () => {
  it('vista de una receta propia por su alimento; un alimento normal no es receta', async () => {
    const id = await recetasRepo.crear({ nombre: 'Arroz con pollo', ingredientes: [arroz, pollo], pesoCocinadoG: 800, raciones: 2, categoria: 'Platos preparados' })
    const { foodId } = (await recetasRepo.obtener(id))!
    expect(await recetasRepo.vista({ tipo: 'user', id: foodId })).toMatchObject({ origen: 'tuya', base: { recetaId: id }, raciones: 2, pesoCocinadoG: 800 })
    const otro = await foodsRepo.crear({ nombre: 'Yogur', kcal100: 60, prot100: 4, carb100: 5, grasa100: 3, fuente: 'manual', categoria: 'Yogures y postres lácteos' })
    expect(await recetasRepo.vista({ tipo: 'user', id: otro })).toBeNull()
  })

  it('vista de un plato del catálogo con sus ingredientes; sin receta o sin ingredientes, null', async () => {
    await db.catalogFoods.bulkAdd([
      catalogo('tipicos:lentejas', 'Lentejas con chorizo', { receta: { pesoFinalG: 2500, ingredientes: [{ catalogId: 'ciqual:1', gramos: 400 }], raciones: 6, pasos: ['Lava las lentejas.'] } }),
      catalogo('tipicos:huerfana', 'Huérfana', { receta: { pesoFinalG: 100, ingredientes: [{ catalogId: 'ciqual:9', gramos: 100 }] } }),
      catalogo('ciqual:1', 'Lenteja, seca'),
    ])
    const v = (await recetasRepo.vista({ tipo: 'catalog', id: 'tipicos:lentejas' }))!
    expect(v).toMatchObject({ origen: 'appfit', raciones: 6, pasos: ['Lava las lentejas.'] })
    expect(v.ingredientes).toEqual([{ catalogId: 'ciqual:1', nombre: 'Lenteja, seca', gramos: 400, kcal: 1320, prot: 96, carb: 200, grasa: 6 }])
    expect(await recetasRepo.vista({ tipo: 'catalog', id: 'ciqual:1' })).toBeNull()
    expect(await recetasRepo.vista({ tipo: 'catalog', id: 'tipicos:huerfana' })).toBeNull()
  })

  it('los ingredientes de una receta propia se enlazan con tus alimentos del mismo nombre y valores', async () => {
    await foodsRepo.crear({ nombre: 'Arroz', kcal100: 350, prot100: 7, carb100: 78, grasa100: 1, fuente: 'manual', categoria: 'Cereales, arroz y pasta' })
    const [enArroz, enPollo] = await recetasRepo.itemsDeIngredientes([arroz, pollo])
    expect(enArroz.origen.guardado).toBe(true)
    expect(enArroz.gramos).toBe(200)
    expect(enPollo.origen.guardado).toBe(false)
  })
})

describe('variantesRepo', () => {
  it('crea, lista por receta, borra y deshace', async () => {
    const id = await variantesRepo.crear({ base: { catalogId: 'tipicos:lentejas' }, nombre: '  Sin chorizo ', ingredientes: [arroz], pesoCocinadoG: 2300 })
    await variantesRepo.crear({ base: { recetaId: 4 }, nombre: 'Otra', ingredientes: [pollo], pesoCocinadoG: 300 })
    const lista = await variantesRepo.deBase({ catalogId: 'tipicos:lentejas' })
    expect(lista.map((v) => v.nombre)).toEqual(['Sin chorizo'])
    const borrada = (await variantesRepo.borrar(id))!
    expect(await variantesRepo.deBase({ catalogId: 'tipicos:lentejas' })).toEqual([])
    await variantesRepo.restaurar(borrada)
    expect(await variantesRepo.deBase({ catalogId: 'tipicos:lentejas' })).toEqual(lista)
  })

  it('rechaza nombre vacío o largo, sin ingredientes o sin peso', async () => {
    const base = { base: { recetaId: 1 }, nombre: 'Variante', ingredientes: [arroz], pesoCocinadoG: 200 }
    await expect(variantesRepo.crear({ ...base, nombre: ' ' })).rejects.toThrow(variantesRepo.VarianteInvalidaError)
    await expect(variantesRepo.crear({ ...base, nombre: 'x'.repeat(61) })).rejects.toThrow(variantesRepo.VarianteInvalidaError)
    await expect(variantesRepo.crear({ ...base, ingredientes: [] })).rejects.toThrow(variantesRepo.VarianteInvalidaError)
    await expect(variantesRepo.crear({ ...base, pesoCocinadoG: 0 })).rejects.toThrow(variantesRepo.VarianteInvalidaError)
    expect(await db.variantesReceta.count()).toBe(0)
  })

  it('borrar una receta propia borra sus variantes', async () => {
    const id = await recetasRepo.crear({ nombre: 'Guiso', ingredientes: [arroz, pollo], pesoCocinadoG: 1000, categoria: 'Platos preparados' })
    await variantesRepo.crear({ base: { recetaId: id }, nombre: 'Sin pollo', ingredientes: [arroz], pesoCocinadoG: 400 })
    await recetasRepo.borrar(id, true)
    expect(await db.variantesReceta.count()).toBe(0)
  })
})
