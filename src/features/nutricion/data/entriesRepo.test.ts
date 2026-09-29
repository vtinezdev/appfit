import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../shared/db/db'
import type { ItemGuardado } from '../lib/alimentos'
import * as entriesRepo from './entriesRepo'
import * as foodsRepo from './foodsRepo'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

const POLLO: foodsRepo.FoodInput = { nombre: 'Pollo', kcal100: 165, prot100: 31, carb100: 0, grasa100: 3.6, fuente: 'gemini' }
const ARROZ: ItemGuardado = { nombre: 'Arroz', gramos: 200, kcal100: 130, prot100: 2.7, carb100: 28, grasa100: 0.3, fuenteSiNuevo: 'gemini' }

function crearPollo(): Promise<number> {
  return foodsRepo.crear(POLLO)
}

describe('entriesRepo: lecturas y añadido rápido', () => {
  it('anadirDesdeAlimento guarda un snapshot de los macros con los valores actuales del alimento', async () => {
    const foodId = await crearPollo()
    const id = await entriesRepo.anadirDesdeAlimento({ fecha: '2026-09-28', comida: 'cena', foodId, gramos: 200 })
    const e = await db.entries.get(id!)
    expect(e).toMatchObject({ fecha: '2026-09-28', comida: 'cena', foodId, nombre: 'Pollo', gramos: 200, kcal: 330, prot: 62, carb: 0, grasa: 7.2 })
  })

  it('anadirDesdeAlimento no modifica el alimento (los frecuentes salen de las entradas)', async () => {
    const foodId = await crearPollo()
    const antes = await foodsRepo.obtener(foodId)
    await entriesRepo.anadirDesdeAlimento({ fecha: '2026-09-28', comida: 'cena', foodId, gramos: 200 })
    expect(await foodsRepo.obtener(foodId)).toEqual(antes)
  })

  it('anadirDesdeAlimento no hace nada si el alimento ya no existe', async () => {
    expect(await entriesRepo.anadirDesdeAlimento({ fecha: '2026-09-28', comida: 'cena', foodId: 999, gramos: 100 })).toBeUndefined()
    expect(await db.entries.count()).toBe(0)
  })

  it('delDia y entreFechas filtran por fecha (ambos extremos incluidos)', async () => {
    const foodId = await crearPollo()
    for (const fecha of ['2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29']) {
      await entriesRepo.anadirDesdeAlimento({ fecha, comida: 'comida', foodId, gramos: 100 })
    }
    expect((await entriesRepo.delDia('2026-09-27')).map((e) => e.fecha)).toEqual(['2026-09-27'])
    expect((await entriesRepo.entreFechas('2026-09-27', '2026-09-28')).map((e) => e.fecha)).toEqual(['2026-09-27', '2026-09-28'])
  })

  it('borrar elimina la entrada', async () => {
    const foodId = await crearPollo()
    const id = await entriesRepo.anadirDesdeAlimento({ fecha: '2026-09-28', comida: 'cena', foodId, gramos: 100 })
    await entriesRepo.borrar(id!)
    expect(await db.entries.count()).toBe(0)
  })
})

describe('entriesRepo.guardarComida', () => {
  it('crea las entradas y los alimentos nuevos con su procedencia', async () => {
    const ids = await entriesRepo.guardarComida({ fecha: '2026-09-28', comida: 'comida', textoOriginal: 'arroz', items: [ARROZ] })
    const e = await db.entries.get(ids[0])
    expect(e).toMatchObject({ nombre: 'Arroz', gramos: 200, kcal: 260, textoOriginal: 'arroz' })
    const food = await foodsRepo.buscarPorNombre('arroz')
    expect(food?.id).toBe(e?.foodId)
    expect(food?.fuente).toBe('gemini')
  })

  it('reutilizar un alimento sin cambiar sus valores no toca su procedencia ni sus valores (P4)', async () => {
    const foodId = await crearPollo()
    await entriesRepo.guardarComida({
      fecha: '2026-09-28',
      comida: 'cena',
      items: [{ nombre: 'pollo', gramos: 150, kcal100: 165, prot100: 31, carb100: 0, grasa100: 3.6, fuenteSiNuevo: 'gemini' }],
    })
    const food = await foodsRepo.obtener(foodId)
    expect(food).toMatchObject({ nombre: 'Pollo', fuente: 'gemini', kcal100: 165 })
    expect(await db.foods.count()).toBe(1)
  })

  it('si el usuario cambia los valores de un alimento guardado, se corrige y pasa a manual', async () => {
    const foodId = await crearPollo()
    await entriesRepo.guardarComida({
      fecha: '2026-09-28',
      comida: 'cena',
      items: [{ nombre: 'Pollo', gramos: 150, kcal100: 120, prot100: 23, carb100: 0, grasa100: 2, fuenteSiNuevo: 'manual' }],
    })
    expect(await foodsRepo.obtener(foodId)).toMatchObject({ nombre: 'Pollo', fuente: 'manual', kcal100: 120 })
  })

  it('renombrar un ítem crea otro alimento y no renombra el original (P11)', async () => {
    const foodId = await crearPollo()
    await entriesRepo.guardarComida({
      fecha: '2026-09-28',
      comida: 'cena',
      items: [{ nombre: 'Pollo al curry', gramos: 150, kcal100: 165, prot100: 31, carb100: 0, grasa100: 3.6, fuenteSiNuevo: 'gemini' }],
    })
    expect(await foodsRepo.obtener(foodId)).toMatchObject({ nombre: 'Pollo', nombreNorm: 'pollo' })
    expect(await foodsRepo.buscarPorNombre('pollo al curry')).toBeDefined()
    expect(await db.foods.count()).toBe(2)
  })

  it('es atómico: si falla el 2.º alimento no se guarda nada (P3)', async () => {
    const addOriginal = db.entries.add.bind(db.entries)
    const spy = vi.spyOn(db.entries, 'add')
    spy.mockImplementationOnce(addOriginal).mockImplementationOnce(() => Promise.reject(new Error('fallo simulado')) as never)
    await expect(
      entriesRepo.guardarComida({
        fecha: '2026-09-28',
        comida: 'comida',
        items: [ARROZ, { ...ARROZ, nombre: 'Pollo', kcal100: 165 }],
      }),
    ).rejects.toThrow('fallo simulado')
    spy.mockRestore()
    expect(await db.entries.count()).toBe(0)
    expect(await db.foods.count()).toBe(0)
  })
})

describe('entriesRepo.editar (P5)', () => {
  async function entradaDePollo(): Promise<{ foodId: number; id: number }> {
    const foodId = await crearPollo()
    const id = (await entriesRepo.anadirDesdeAlimento({ fecha: '2026-09-28', comida: 'cena', foodId, gramos: 100 }))!
    return { foodId, id }
  }

  it('sin la casilla solo cambia la entrada, no el alimento guardado', async () => {
    const { foodId, id } = await entradaDePollo()
    await entriesRepo.editar(id, { comida: 'comida', nombre: 'Pollo', gramos: 200, kcal100: 100, prot100: 20, carb100: 0, grasa100: 2, aplicarAlAlimento: false })
    expect(await db.entries.get(id)).toMatchObject({ comida: 'comida', gramos: 200, kcal: 200, prot: 40, foodId })
    expect(await foodsRepo.obtener(foodId)).toMatchObject({ kcal100: 165, fuente: 'gemini' })
  })

  it('con la casilla aplica también los valores y el nombre al alimento', async () => {
    const { foodId, id } = await entradaDePollo()
    await entriesRepo.editar(id, { comida: 'cena', nombre: 'Pollo asado', gramos: 100, kcal100: 190, prot100: 29, carb100: 0, grasa100: 8, aplicarAlAlimento: true })
    expect(await foodsRepo.obtener(foodId)).toMatchObject({ nombre: 'Pollo asado', nombreNorm: 'pollo asado', kcal100: 190, fuente: 'manual' })
  })

  it('con la casilla y un nombre que ya existe, falla sin guardar nada', async () => {
    const { id } = await entradaDePollo()
    await foodsRepo.crear({ nombre: 'Pavo', kcal100: 135, prot100: 30, carb100: 0, grasa100: 1, fuente: 'manual' })
    await expect(
      entriesRepo.editar(id, { comida: 'cena', nombre: 'pavo', gramos: 300, kcal100: 135, prot100: 30, carb100: 0, grasa100: 1, aplicarAlAlimento: true }),
    ).rejects.toBeInstanceOf(foodsRepo.NombreDuplicadoError)
    expect(await db.entries.get(id)).toMatchObject({ nombre: 'Pollo', gramos: 100 })
  })
})

describe('entriesRepo.anadirRapida / editarRapida (A5)', () => {
  it('anadirRapida guarda una entrada sin alimento (gramos = 0, sin foodId) marcada como rápida', async () => {
    const id = await entriesRepo.anadirRapida({ fecha: '2026-09-28', comida: 'snack', nombre: 'Pizza fuera', kcal: 900, prot: 40, carb: 0, grasa: 0 })
    const entry = await db.entries.get(id)
    expect(entry?.foodId).toBeUndefined()
    expect(entry).toMatchObject({
      fecha: '2026-09-28', comida: 'snack', nombre: 'Pizza fuera', gramos: 0, kcal: 900, prot: 40, carb: 0, grasa: 0, rapida: true,
    })
  })

  it('editarRapida cambia los valores sin tocar fecha, comida ni gramos', async () => {
    const id = await entriesRepo.anadirRapida({ fecha: '2026-09-28', comida: 'snack', nombre: 'Pizza fuera', kcal: 900, prot: 40, carb: 0, grasa: 0 })
    await entriesRepo.editarRapida(id, { nombre: 'Pizza y helado', kcal: 1100, prot: 40, carb: 90, grasa: 30 })
    expect(await db.entries.get(id)).toMatchObject({
      fecha: '2026-09-28', comida: 'snack', gramos: 0, nombre: 'Pizza y helado', kcal: 1100, carb: 90, grasa: 30, rapida: true,
    })
  })

  it('las entradas rápidas no cuentan como frecuentes (rankFrecuentes ya las excluye)', async () => {
    for (let i = 0; i < 3; i++) {
      await entriesRepo.anadirRapida({ fecha: '2026-09-28', comida: 'snack', nombre: 'Pizza fuera', kcal: 900, prot: 0, carb: 0, grasa: 0 })
    }
    expect(await foodsRepo.frecuentes({ comida: 'snack', hoy: '2026-09-28' })).toEqual([])
  })
})

describe('entriesRepo.copiar / borrarVarias (A2)', () => {
  it('copia las entradas de una comida a otro día sin tocar el origen', async () => {
    const foodId = await crearPollo()
    await entriesRepo.anadirDesdeAlimento({ fecha: '2026-09-27', comida: 'cena', foodId, gramos: 100 })
    const ids = await entriesRepo.copiar({ origen: { fecha: '2026-09-27', comida: 'cena' }, destino: { fecha: '2026-09-28', comida: 'cena' } })
    expect(ids).toHaveLength(1)
    expect(await db.entries.get(ids[0])).toMatchObject({ fecha: '2026-09-28', comida: 'cena', foodId, nombre: 'Pollo', gramos: 100 })
    expect(await entriesRepo.delDia('2026-09-27')).toHaveLength(1)
  })

  it('copia el día entero conservando la comida de cada entrada si no se especifica destino.comida', async () => {
    const foodId = await crearPollo()
    await entriesRepo.anadirDesdeAlimento({ fecha: '2026-09-27', comida: 'desayuno', foodId, gramos: 50 })
    await entriesRepo.anadirDesdeAlimento({ fecha: '2026-09-27', comida: 'cena', foodId, gramos: 100 })
    const ids = await entriesRepo.copiar({ origen: { fecha: '2026-09-27' }, destino: { fecha: '2026-09-28' } })
    expect(ids).toHaveLength(2)
    const nuevas = await entriesRepo.delDia('2026-09-28')
    expect(nuevas.map((e) => e.comida).sort()).toEqual(['cena', 'desayuno'])
  })

  it('sin entradas en el origen no copia nada', async () => {
    expect(await entriesRepo.copiar({ origen: { fecha: '2026-09-27' }, destino: { fecha: '2026-09-28' } })).toEqual([])
  })

  it('es atómico: si falla la inserción no queda nada a medias', async () => {
    const foodId = await crearPollo()
    await entriesRepo.anadirDesdeAlimento({ fecha: '2026-09-27', comida: 'cena', foodId, gramos: 100 })
    const spy = vi.spyOn(db.entries, 'bulkAdd').mockImplementationOnce(() => Promise.reject(new Error('fallo simulado')) as never)
    await expect(entriesRepo.copiar({ origen: { fecha: '2026-09-27' }, destino: { fecha: '2026-09-28' } })).rejects.toThrow('fallo simulado')
    spy.mockRestore()
    expect(await db.entries.count()).toBe(1)
  })

  it('borrarVarias borra y devuelve las entradas, para poder deshacer con restaurar', async () => {
    const foodId = await crearPollo()
    const id1 = (await entriesRepo.anadirDesdeAlimento({ fecha: '2026-09-28', comida: 'cena', foodId, gramos: 100 }))!
    const id2 = (await entriesRepo.anadirDesdeAlimento({ fecha: '2026-09-28', comida: 'snack', foodId, gramos: 50 }))!
    const borradas = await entriesRepo.borrarVarias([id1, id2])
    expect(borradas).toHaveLength(2)
    expect(await db.entries.count()).toBe(0)
    await entriesRepo.restaurar(borradas)
    expect(await db.entries.count()).toBe(2)
  })
})

describe('entriesRepo.borrar / restaurar (P8)', () => {
  it('borrar devuelve la entrada y restaurar la recupera con el mismo id y los mismos datos', async () => {
    const foodId = await crearPollo()
    const id = (await entriesRepo.anadirDesdeAlimento({ fecha: '2026-09-28', comida: 'cena', foodId, gramos: 150 }))!
    const original = await db.entries.get(id)
    const borrada = await entriesRepo.borrar(id)
    expect(borrada).toEqual(original)
    expect(await db.entries.count()).toBe(0)
    await entriesRepo.restaurar([borrada!])
    expect(await db.entries.get(id)).toEqual(original)
  })

  it('borrar una entrada que no existe devuelve undefined', async () => {
    expect(await entriesRepo.borrar(123)).toBeUndefined()
  })
})
