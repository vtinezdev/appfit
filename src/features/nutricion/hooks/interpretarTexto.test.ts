import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../shared/db/db'
import * as foodsRepo from '../data/foodsRepo'
import * as porcionesRepo from '../data/porcionesRepo'
import { interpretarTexto } from './useInterpretarLocal'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('interpretarTexto con raciones propias', () => {
  it('«2 tostadas de pan bimbo» usa 2 × los gramos de la ración de ese alimento', async () => {
    const id = await foodsRepo.crear({ nombre: 'Pan Bimbo', kcal100: 250, prot100: 8, carb100: 48, grasa100: 3, fuente: 'manual' })
    await porcionesRepo.crear(`user:${id}`, 'tostada', 32)
    const [item] = await interpretarTexto('2 tostadas de pan bimbo')
    expect(item).toMatchObject({ nombre: 'Pan Bimbo', gramos: 64 })
    expect(item.gramosEstimados).toBeFalsy()
    expect(item.origen.guardado).toBe(true)
  })

  it('tiene prioridad sobre las raciones fijas («rebanada» = 30 g)', async () => {
    const id = await foodsRepo.crear({ nombre: 'Pan Bimbo', kcal100: 250, prot100: 8, carb100: 48, grasa100: 3, fuente: 'manual' })
    await porcionesRepo.crear(`user:${id}`, 'rebanada', 45)
    const [propia] = await interpretarTexto('una rebanada de pan bimbo')
    expect(propia.gramos).toBe(45)
  })

  it('con otro alimento, la ración propia no se aplica y sigue la medida ambigua de siempre', async () => {
    const id = await foodsRepo.crear({ nombre: 'Pan Bimbo', kcal100: 250, prot100: 8, carb100: 48, grasa100: 3, fuente: 'manual' })
    await porcionesRepo.crear(`user:${id}`, 'rebanada', 45)
    await foodsRepo.crear({ nombre: 'Queso fresco', kcal100: 100, prot100: 8, carb100: 3, grasa100: 5, fuente: 'manual' })
    const [queso] = await interpretarTexto('una rebanada de queso fresco')
    expect(queso.nombre).toBe('Queso fresco')
    expect(queso.medida).toBeDefined()
    expect(queso.gramos).not.toBe(45)
  })

  it('una frase sin alimentos devuelve vacío', async () => {
    expect(await interpretarTexto('   ')).toEqual([])
  })
})
