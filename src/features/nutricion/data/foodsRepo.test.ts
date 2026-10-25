import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../shared/db/db'
import type { CatalogFood } from '../../../shared/db/types'
import { tokenizar } from '../../../shared/lib/text'
import * as catalogRepo from './catalogRepo'
import * as entriesRepo from './entriesRepo'
import * as foodsRepo from './foodsRepo'

function catalogo(idExterno: string, nombre: string): CatalogFood {
  return {
    id: `ciqual:${idExterno}`, fuente: 'ciqual', idExterno, nombre, nombreNorm: nombre.toLowerCase(), tok: tokenizar(nombre),
    tipo: 'generico', categoria: 'Frutas', kcal100: 90, prot100: 1, carb100: 20, grasa100: 0.3, version: '1', importadoAt: 0,
  }
}

const PLATANO: foodsRepo.FoodInput = { nombre: 'Plátano', kcal100: 89, prot100: 1.1, carb100: 22.8, grasa100: 0.3, fuente: 'manual', categoria: 'Frutas' }
const ARROZ: foodsRepo.FoodInput = { nombre: 'Arroz blanco', kcal100: 130, prot100: 2.7, carb100: 28, grasa100: 0.3, fuente: 'gemini', categoria: 'Cereales, arroz y pasta' }

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
    const id = await foodsRepo.resolverParaGuardar({ nombre: 'Kiwi', gramos: 80, kcal100: 61, prot100: 1.1, carb100: 15, grasa100: 0.5, fuenteSiNuevo: 'manual', categoria: 'Otros' })
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
    expect((await foodsRepo.frecuentes({ comida: 'cena', hoy: '2026-09-28' })).map((f) => f.ref.id)).toEqual([id])
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
    expect(cena.map((f) => f.ref.id).slice(0, 2)).toEqual([arroz, platano])
    expect(cena.map((f) => f.ref.id)).toContain(kiwi)
    expect(new Set(cena.map((f) => f.ref.id)).size).toBe(cena.length)
  })

  it('descarta los alimentos borrados', async () => {
    const platano = await foodsRepo.crear(PLATANO)
    await entriesRepo.anadirDesdeAlimento({ fecha: '2026-09-28', comida: 'cena', foodId: platano, gramos: 100 })
    await foodsRepo.borrar(platano)
    expect(await foodsRepo.frecuentes({ comida: 'cena', hoy: '2026-09-28' })).toEqual([])
  })

  it('incluye alimentos del catálogo usados y descarta los que ya no están en el catálogo', async () => {
    await catalogRepo.guardarLote([catalogo('13005', 'Plátano, pulpa, crudo'), catalogo('9100', 'Arroz blanco, crudo')])
    const propio = await foodsRepo.crear(ARROZ)
    for (let i = 0; i < 2; i++) await entriesRepo.anadirDesdeCatalogo({ fecha: '2026-09-28', comida: 'cena', catalogId: 'ciqual:13005', gramos: 120 })
    await entriesRepo.anadirDesdeAlimento({ fecha: '2026-09-28', comida: 'cena', foodId: propio, gramos: 100 })
    await entriesRepo.anadirDesdeCatalogo({ fecha: '2026-09-28', comida: 'cena', catalogId: 'ciqual:9100', gramos: 80 })
    await db.catalogFoods.delete('ciqual:9100') // p. ej. el catálogo se actualizó y ya no lo trae
    const cena = await foodsRepo.frecuentes({ comida: 'cena', hoy: '2026-09-28' })
    expect(cena.map((a) => a.ref)).toEqual([
      { tipo: 'catalog', id: 'ciqual:13005' },
      { tipo: 'user', id: propio },
    ])
    expect(cena[0]).toMatchObject({ nombre: 'Plátano, pulpa, crudo', categoria: 'Frutas', kcal100: 90 })
  })

  it('buscar encuentra sin tildes', async () => {
    await foodsRepo.crear(PLATANO)
    await foodsRepo.crear(ARROZ)
    expect((await foodsRepo.buscar('platano')).map((f) => f.nombre)).toEqual(['Plátano'])
  })
})

describe('foodsRepo: categorías', () => {
  it('crear exige una categoría válida', async () => {
    await expect(foodsRepo.crear({ ...PLATANO, categoria: 'Fruta' as never })).rejects.toThrow(foodsRepo.CategoriaRequeridaError)
    await expect(foodsRepo.crear({ ...PLATANO, categoria: undefined as never })).rejects.toThrow(foodsRepo.CategoriaRequeridaError)
    expect(await db.foods.count()).toBe(0)
    const id = await foodsRepo.crear(PLATANO)
    expect((await db.foods.get(id))?.categoria).toBe('Frutas')
  })

  it('actualizar sin categoría conserva la actual; con ella, la cambia (y tiene que ser válida)', async () => {
    const id = await foodsRepo.crear(PLATANO)
    await foodsRepo.actualizar(id, { nombre: 'Plátano', kcal100: 90, prot100: 1, carb100: 23, grasa100: 0.3, fuente: 'manual' })
    expect((await db.foods.get(id))?.categoria).toBe('Frutas')
    await foodsRepo.actualizar(id, { ...PLATANO, categoria: 'Dulces y chocolate' })
    expect((await db.foods.get(id))?.categoria).toBe('Dulces y chocolate')
    await expect(foodsRepo.actualizar(id, { ...PLATANO, categoria: 'x' as never })).rejects.toThrow(foodsRepo.CategoriaRequeridaError)
  })

  it('un alimento antiguo sin categoría la recibe al editarlo', async () => {
    const id = await db.foods.add({ nombre: 'Antiguo', nombreNorm: 'antiguo', kcal100: 1, prot100: 1, carb100: 1, grasa100: 1, fuente: 'manual', updatedAt: 0 })
    await foodsRepo.actualizar(id, { nombre: 'Antiguo', kcal100: 1, prot100: 1, carb100: 1, grasa100: 1, fuente: 'manual', categoria: 'Otros' })
    expect((await db.foods.get(id))?.categoria).toBe('Otros')
  })

  it('resolverParaGuardar: crear exige la categoría del ítem; reutilizar completa la de un alimento antiguo, sin pisar la que tenga', async () => {
    const item = { nombre: 'Kiwi', gramos: 80, kcal100: 61, prot100: 1.1, carb100: 15, grasa100: 0.5, fuenteSiNuevo: 'manual' as const }
    await expect(foodsRepo.resolverParaGuardar(item)).rejects.toThrow(foodsRepo.CategoriaRequeridaError)
    const id = await foodsRepo.resolverParaGuardar({ ...item, categoria: 'Frutas' })
    expect((await db.foods.get(id))?.categoria).toBe('Frutas')
    expect(await foodsRepo.resolverParaGuardar({ ...item, categoria: 'Otros' })).toBe(id)
    expect((await db.foods.get(id))?.categoria).toBe('Frutas')

    const pera = { ...item, nombre: 'Pera', kcal100: 57, prot100: 0.4, carb100: 15, grasa100: 0.1 }
    const antiguo = await db.foods.add({ nombre: 'Pera', nombreNorm: 'pera', kcal100: 57, prot100: 0.4, carb100: 15, grasa100: 0.1, fuente: 'manual', updatedAt: 0 })
    expect(await foodsRepo.resolverParaGuardar(pera)).toBe(antiguo)
    expect((await db.foods.get(antiguo))?.categoria).toBeUndefined()
    await foodsRepo.resolverParaGuardar({ ...pera, categoria: 'Frutas' })
    expect((await db.foods.get(antiguo))?.categoria).toBe('Frutas')
  })

  it('categoriasDeEntradas: la categoría actual del alimento propio o del catálogo, por referencia', async () => {
    await catalogRepo.guardarLote([catalogo('1', 'Manzana')])
    const pollo = await foodsRepo.crear({ nombre: 'Pollo', kcal100: 165, prot100: 31, carb100: 0, grasa100: 3.6, fuente: 'manual', categoria: 'Carnes' })
    const antiguo = await db.foods.add({ nombre: 'Antiguo', nombreNorm: 'antiguo', kcal100: 1, prot100: 1, carb100: 1, grasa100: 1, fuente: 'manual', updatedAt: 0 })
    const categorias = await foodsRepo.categoriasDeEntradas([
      { foodId: pollo }, { foodId: pollo }, { catalogId: 'ciqual:1' }, { foodId: antiguo }, { foodId: 999 }, { rapida: true }, { foodId: pollo, catalogId: 'ciqual:1' },
    ])
    expect(Object.fromEntries(categorias)).toEqual({ ['user:' + pollo]: 'Carnes', 'catalog:ciqual:1': 'Frutas' })
    await foodsRepo.actualizar(pollo, { nombre: 'Pollo', kcal100: 165, prot100: 31, carb100: 0, grasa100: 3.6, fuente: 'manual', categoria: 'Platos preparados' })
    expect((await foodsRepo.categoriasDeEntradas([{ foodId: pollo }])).get('user:' + pollo)).toBe('Platos preparados')
  })
})
