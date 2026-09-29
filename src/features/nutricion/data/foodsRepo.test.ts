import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../shared/db/db'
import * as entriesRepo from './entriesRepo'
import * as foodsRepo from './foodsRepo'

const PLATANO: foodsRepo.FoodInput = { nombre: 'Plátano', kcal100: 89, prot100: 1.1, carb100: 22.8, grasa100: 0.3, fuente: 'manual' }
const ARROZ: foodsRepo.FoodInput = { nombre: 'Arroz blanco', kcal100: 130, prot100: 2.7, carb100: 28, grasa100: 0.3, fuente: 'gemini' }

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('foodsRepo', () => {
  it('crear calcula nombreNorm y listar ordena por nombre', async () => {
    await foodsRepo.crear(PLATANO)
    await foodsRepo.crear(ARROZ)
    const lista = await foodsRepo.listar()
    expect(lista.map((f) => f.nombre)).toEqual(['Arroz blanco', 'Plátano'])
    expect(lista[1].nombreNorm).toBe('platano')
  })

  it('buscarPorNombre ignora tildes y mayúsculas', async () => {
    const id = await foodsRepo.crear(PLATANO)
    expect((await foodsRepo.buscarPorNombre('  PLATANO '))?.id).toBe(id)
    expect(await foodsRepo.buscarPorNombre('manzana')).toBeUndefined()
  })

  it('buscarPorNombres devuelve un mapa por nombre normalizado', async () => {
    await foodsRepo.crear(PLATANO)
    await foodsRepo.crear(ARROZ)
    const mapa = await foodsRepo.buscarPorNombres(['plátano', 'Arroz Blanco', 'pan'])
    expect([...mapa.keys()].sort()).toEqual(['arroz blanco', 'platano'])
  })

  it('actualizar recalcula nombreNorm al renombrar', async () => {
    const id = await foodsRepo.crear(PLATANO)
    await foodsRepo.actualizar(id, { ...PLATANO, nombre: 'Plátano de Canarias' })
    expect((await foodsRepo.obtener(id))?.nombreNorm).toBe('platano de canarias')
  })

  it('recientes ordena por updatedAt descendente', async () => {
    const a = await foodsRepo.crear(PLATANO)
    const b = await foodsRepo.crear(ARROZ)
    await db.foods.update(a, { updatedAt: 1 })
    await db.foods.update(b, { updatedAt: 2 })
    expect((await foodsRepo.recientes(10)).map((f) => f.id)).toEqual([b, a])
  })

  it('crear con un nombre que ya existe lanza NombreDuplicadoError (P12)', async () => {
    await foodsRepo.crear(PLATANO)
    await expect(foodsRepo.crear({ ...PLATANO, nombre: 'platano' })).rejects.toBeInstanceOf(foodsRepo.NombreDuplicadoError)
  })

  it('actualizar a un nombre de otro alimento lanza NombreDuplicadoError; al mismo, no', async () => {
    const id = await foodsRepo.crear(PLATANO)
    await foodsRepo.crear(ARROZ)
    await expect(foodsRepo.actualizar(id, { ...PLATANO, nombre: 'ARROZ BLANCO' })).rejects.toBeInstanceOf(foodsRepo.NombreDuplicadoError)
    await expect(foodsRepo.actualizar(id, { ...PLATANO, kcal100: 90 })).resolves.toBeUndefined()
    expect((await foodsRepo.obtener(id))?.kcal100).toBe(90)
  })

  it('resolverParaGuardar crea con la procedencia indicada si el nombre no existe', async () => {
    const id = await foodsRepo.resolverParaGuardar({ nombre: 'Kiwi', gramos: 80, kcal100: 61, prot100: 1.1, carb100: 15, grasa100: 0.5, fuenteSiNuevo: 'manual' })
    expect(await foodsRepo.obtener(id)).toMatchObject({ nombre: 'Kiwi', nombreNorm: 'kiwi', fuente: 'manual' })
  })

  it('borrar elimina el alimento', async () => {
    const id = await foodsRepo.crear(PLATANO)
    await foodsRepo.borrar(id)
    expect(await foodsRepo.obtener(id)).toBeUndefined()
  })

  it('borrar devuelve el alimento y restaurar lo recupera con el mismo id', async () => {
    const id = await foodsRepo.crear(PLATANO)
    const original = await foodsRepo.obtener(id)
    const borrado = await foodsRepo.borrar(id)
    expect(borrado).toEqual(original)
    await foodsRepo.restaurar(borrado!)
    expect(await foodsRepo.obtener(id)).toEqual(original)
  })

  it('tras restaurar, el alimento vuelve a contar para los frecuentes de sus entradas', async () => {
    const id = await foodsRepo.crear(PLATANO)
    await entriesRepo.anadirDesdeAlimento({ fecha: '2026-09-28', comida: 'cena', foodId: id, gramos: 100 })
    await foodsRepo.restaurar((await foodsRepo.borrar(id))!)
    expect((await foodsRepo.frecuentes({ comida: 'cena', hoy: '2026-09-28' })).map((f) => f.id)).toEqual([id])
  })

  it('borrar un alimento que no existe devuelve undefined', async () => {
    expect(await foodsRepo.borrar(999)).toBeUndefined()
  })

  it('restaurar lanza NombreDuplicadoError si entretanto se creó otro con el mismo nombre', async () => {
    const borrado = (await foodsRepo.borrar(await foodsRepo.crear(PLATANO)))!
    await foodsRepo.crear(PLATANO)
    await expect(foodsRepo.restaurar(borrado)).rejects.toBeInstanceOf(foodsRepo.NombreDuplicadoError)
  })

  it('porIds devuelve un mapa por id, descartando los que no existen (A1)', async () => {
    const platano = await foodsRepo.crear(PLATANO)
    const mapa = await foodsRepo.porIds([platano, 999])
    expect([...mapa.keys()]).toEqual([platano])
    expect(mapa.get(platano)?.nombre).toBe('Plátano')
  })
})

describe('foodsRepo.frecuentes y buscar (A3)', () => {
  it('ordena por uso en esa comida y completa con recientes', async () => {
    const platano = await foodsRepo.crear(PLATANO)
    const arroz = await foodsRepo.crear(ARROZ)
    const kiwi = await foodsRepo.crear({ ...PLATANO, nombre: 'Kiwi' })
    for (let i = 0; i < 3; i++) await entriesRepo.anadirDesdeAlimento({ fecha: '2026-09-27', comida: 'cena', foodId: arroz, gramos: 100 })
    await entriesRepo.anadirDesdeAlimento({ fecha: '2026-09-28', comida: 'desayuno', foodId: platano, gramos: 100 })
    const cena = await foodsRepo.frecuentes({ comida: 'cena', hoy: '2026-09-28' })
    expect(cena.map((f) => f.id).slice(0, 2)).toEqual([arroz, platano])
    expect(cena.map((f) => f.id)).toContain(kiwi)
    expect(new Set(cena.map((f) => f.id)).size).toBe(cena.length)
  })

  it('descarta los alimentos borrados', async () => {
    const platano = await foodsRepo.crear(PLATANO)
    await entriesRepo.anadirDesdeAlimento({ fecha: '2026-09-28', comida: 'cena', foodId: platano, gramos: 100 })
    await foodsRepo.borrar(platano)
    expect(await foodsRepo.frecuentes({ comida: 'cena', hoy: '2026-09-28' })).toEqual([])
  })

  it('buscar encuentra sin tildes', async () => {
    await foodsRepo.crear(PLATANO)
    await foodsRepo.crear(ARROZ)
    expect((await foodsRepo.buscar('platano')).map((f) => f.nombre)).toEqual(['Plátano'])
  })
})
