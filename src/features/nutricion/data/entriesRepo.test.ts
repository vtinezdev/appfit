import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../shared/db/db'
import { refDe } from '../../../shared/db/foodRef'
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
  it('guardarComida: un ítem con catalogId referencia el catálogo sin crear ni tocar alimentos propios', async () => {
    const foodId = await crearPollo()
    const antes = await foodsRepo.obtener(foodId)
    const ids = await entriesRepo.guardarComida({
      fecha: '2026-09-28',
      comida: 'comida',
      items: [
        { nombre: 'Pollo', gramos: 150, kcal100: 165, prot100: 31, carb100: 0, grasa100: 3.6, fuenteSiNuevo: 'manual', catalogId: 'ciqual:36003' },
        ARROZ,
      ],
    })
    const [delCatalogo, propia] = await Promise.all(ids.map((id) => db.entries.get(id)))
    expect(delCatalogo).toMatchObject({ catalogId: 'ciqual:36003', nombre: 'Pollo', gramos: 150, kcal: 247.5 })
    expect(delCatalogo?.foodId).toBeUndefined()
    expect(() => refDe(delCatalogo!)).not.toThrow()
    expect(propia?.catalogId).toBeUndefined()
    expect(propia?.foodId).toBeDefined()
    // Solo se ha creado el alimento del ítem sin catalogId (Arroz); Pollo sigue igual aunque se llame igual.
    expect((await db.foods.toArray()).map((f) => f.nombre).sort()).toEqual(['Arroz', 'Pollo'])
    expect(await foodsRepo.obtener(foodId)).toEqual(antes)
  })

  it('anadirDesdeAlimento guarda un snapshot de los macros con los valores actuales del alimento', async () => {
    const foodId = await crearPollo()
    const id = await entriesRepo.anadirDesdeAlimento({ fecha: '2026-09-28', comida: 'cena', foodId, gramos: 200 })
    const e = await db.entries.get(id!)
    expect(e).toMatchObject({ fecha: '2026-09-28', comida: 'cena', foodId, nombre: 'Pollo', gramos: 200, kcal: 330, prot: 62, carb: 0, grasa: 7.2 })
  })

  it('anadirDesdeCatalogo guarda catalogId y el snapshot, sin crear ningún alimento', async () => {
    await db.catalogFoods.put({
      id: 'ciqual:36018', fuente: 'ciqual', idExterno: '36018', nombre: 'Pollo, pechuga a la plancha', nombreNorm: 'pollo, pechuga a la plancha',
      tok: ['pollo', 'pechuga'], tipo: 'generico', kcal100: 150, prot100: 30, carb100: 0, grasa100: 3, version: '1', importadoAt: 0,
    })
    const id = await entriesRepo.anadirDesdeCatalogo({ fecha: '2026-09-28', comida: 'cena', catalogId: 'ciqual:36018', gramos: 150 })
    const e = await db.entries.get(id!)
    expect(e).toMatchObject({ catalogId: 'ciqual:36018', nombre: 'Pollo, pechuga a la plancha', gramos: 150, kcal: 225, prot: 45, carb: 0, grasa: 4.5 })
    expect(e?.foodId).toBeUndefined()
    expect(await db.foods.count()).toBe(0)
  })

  it('anadirDesdeCatalogo devuelve undefined si el alimento ya no está en el catálogo', async () => {
    expect(await entriesRepo.anadirDesdeCatalogo({ fecha: '2026-09-28', comida: 'cena', catalogId: 'ciqual:1', gramos: 100 })).toBeUndefined()
    expect(await db.entries.count()).toBe(0)
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
  it('añade un alimento al plato elegido sin modificar snapshots ni mezclar otros platos', async () => {
    const input = { fecha: '2026-10-03', comida: 'comida' as const, items: [{ ...ARROZ, nutrientes: { fibra: 2, sal: 0.02 } }, { ...ARROZ, nombre: 'Pollo' }], nombrePlato: 'Mi plato' }
    const ids = await entriesRepo.guardarComida(input)
    await entriesRepo.guardarComida(input)
    const antes = await db.entries.toArray()
    const nuevo = await entriesRepo.guardarComida({ ...input, items: [{ ...ARROZ, nombre: 'Tomate', gramos: 50, nutrientes: { fibra: 1 } }], platoDestinoId: antes[0].platoId, nombrePlato: 'No renombrar' })
    expect(nuevo).toHaveLength(1)
    expect(await db.entries.get(nuevo[0])).toMatchObject({ platoId: antes[0].platoId, nombrePlato: 'Mi plato', gramos: 50, nutrientes: { fibra: 0.5 } })
    expect(await db.entries.bulkGet(antes.map((e) => e.id))).toEqual(antes)
    expect((await db.entries.filter((e) => e.platoId === antes[0].platoId).toArray()).length).toBe(3)
    expect(ids).toHaveLength(2)
  })

  it('añade varios ingredientes a un plato sin nombre con un único ingrediente restante', async () => {
    const ids = await entriesRepo.guardarComida({ fecha: '2026-10-03', comida: 'cena', items: [ARROZ, { ...ARROZ, nombre: 'Pollo' }] })
    const original = (await db.entries.get(ids[0]))!
    await entriesRepo.borrar(ids[1])
    const nuevos = await entriesRepo.guardarComida({ fecha: original.fecha, comida: original.comida, platoDestinoId: original.platoId, nombrePlato: 'Ignorado', items: [{ ...ARROZ, nombre: 'Tomate' }, { ...ARROZ, nombre: 'Queso' }] })
    for (const id of nuevos) {
      expect(await db.entries.get(id)).toMatchObject({ platoId: original.platoId })
      expect(await db.entries.get(id)).not.toHaveProperty('nombrePlato')
    }
    expect(await db.entries.get(original.id)).toEqual(original)
  })

  it.each(['borrado', 'otra fecha', 'otra comida', 'id vacío'] as const)('rechaza un destino %s sin guardar alimentos ni entradas', async (caso) => {
    const ids = await entriesRepo.guardarComida({ fecha: '2026-10-03', comida: 'cena', items: [ARROZ, { ...ARROZ, nombre: 'Pollo' }] })
    const platoId = (await db.entries.get(ids[0]))!.platoId!
    if (caso === 'borrado') await entriesRepo.borrarVarias(ids)
    const antes = await db.entries.toArray()
    const alimentos = await db.foods.toArray()
    await expect(entriesRepo.guardarComida({ fecha: caso === 'otra fecha' ? '2026-10-02' : '2026-10-03', comida: caso === 'otra comida' ? 'comida' : 'cena', platoDestinoId: caso === 'id vacío' ? '' : platoId, items: [{ ...ARROZ, nombre: 'Nuevo alimento' }] })).rejects.toBeInstanceOf(entriesRepo.PlatoNoDisponibleError)
    expect(await db.entries.toArray()).toEqual(antes)
    expect(await db.foods.toArray()).toEqual(alimentos)
  })

  it('revierte todos los añadidos si falla uno y mantiene intacto el plato original', async () => {
    const ids = await entriesRepo.guardarComida({ fecha: '2026-10-03', comida: 'cena', items: [ARROZ, { ...ARROZ, nombre: 'Pollo' }] })
    const antes = await db.entries.toArray()
    const alimentos = await db.foods.toArray()
    const addOriginal = db.entries.add.bind(db.entries)
    const spy = vi.spyOn(db.entries, 'add').mockImplementationOnce(addOriginal).mockImplementationOnce(() => Promise.reject(new Error('fallo simulado')) as never)
    try {
      await expect(entriesRepo.guardarComida({ fecha: '2026-10-03', comida: 'cena', platoDestinoId: antes[0].platoId, items: [{ ...ARROZ, nombre: 'Tomate' }, { ...ARROZ, nombre: 'Queso' }] })).rejects.toThrow('fallo simulado')
    } finally { spy.mockRestore() }
    expect(await db.entries.bulkGet(ids)).toEqual(antes)
    expect(await db.entries.toArray()).toEqual(antes)
    expect(await db.foods.toArray()).toEqual(alimentos)
  })

  it('cada guardado múltiple crea un plato distinto, incluso con el mismo texto y hora', async () => {
    const reloj = vi.spyOn(Date, 'now').mockReturnValue(100)
    const input = { fecha: '2026-10-02', comida: 'cena' as const, items: [ARROZ, { ...ARROZ, nombre: 'Pollo' }], textoOriginal: 'arroz y pollo', nombrePlato: '  Arroz con pollo  ' }
    const ids = await entriesRepo.guardarComida(input)
    const siguientes = await entriesRepo.guardarComida(input)
    const platos = (await db.entries.bulkGet([...ids, ...siguientes])).map((e) => e!)
    expect(platos[0].platoId).toEqual(expect.any(String))
    expect(platos[0].platoId).toBe(platos[1].platoId)
    expect(platos[2].platoId).toBe(platos[3].platoId)
    expect(platos[0].platoId).not.toBe(platos[2].platoId)
    expect(platos.every((e) => e.createdAt === 100)).toBe(true)
    expect(platos.every((e) => e.nombrePlato === 'Arroz con pollo')).toBe(true)
    reloj.mockRestore()
  })

  it('un alimento aislado no crea grupo; un plato sin nombre permite el título automático', async () => {
    const individual = await entriesRepo.guardarComida({ fecha: '2026-10-02', comida: 'cena', items: [ARROZ], nombrePlato: 'Ignorado' })
    expect(await db.entries.get(individual[0])).not.toHaveProperty('platoId')
    expect(await db.entries.get(individual[0])).not.toHaveProperty('nombrePlato')
    const plato = await entriesRepo.guardarComida({ fecha: '2026-10-02', comida: 'cena', items: [ARROZ, { ...ARROZ, nombre: 'Pollo' }], nombrePlato: '  ' })
    expect((await db.entries.get(plato[0]))?.platoId).toBeDefined()
    expect(await db.entries.get(plato[0])).not.toHaveProperty('nombrePlato')
  })

  it('editar gramos mantiene el plato; mover un ingrediente a otra comida lo separa', async () => {
    const ids = await entriesRepo.guardarComida({ fecha: '2026-10-02', comida: 'cena', items: [ARROZ, { ...ARROZ, nombre: 'Pollo' }], nombrePlato: 'Mi plato' })
    const original = await db.entries.get(ids[1])
    const datos = { ...ARROZ, gramos: 300, aplicarAlAlimento: false }
    await entriesRepo.editar(ids[0], { ...datos, comida: 'cena' })
    expect(await db.entries.get(ids[0])).toMatchObject({ platoId: original!.platoId, nombrePlato: 'Mi plato', gramos: 300, kcal: 390 })
    expect(await db.entries.get(ids[1])).toEqual(original)
    await entriesRepo.editar(ids[0], { ...datos, comida: 'snack' })
    expect((await db.entries.get(ids[0]))?.platoId).toBeUndefined()
    expect((await db.entries.get(ids[0]))?.nombrePlato).toBeUndefined()
    expect(await db.entries.get(ids[1])).toEqual(original)
  })

  it('copiar dos veces conserva platos separados; borrar y deshacer restaura exactamente sus ingredientes', async () => {
    const origen = { fecha: '2026-10-01', comida: 'cena' as const }
    const originales = await entriesRepo.guardarComida({ ...origen, items: [ARROZ, { ...ARROZ, nombre: 'Pollo' }], nombrePlato: 'Mi plato' })
    const destino = { fecha: '2026-10-02', comida: 'cena' as const }
    const primera = await entriesRepo.copiar({ origen, destino })
    const segunda = await entriesRepo.copiar({ origen, destino })
    const copias = await entriesRepo.delDia(destino.fecha)
    expect(copias[0].platoId).toBe(copias[1].platoId)
    expect(copias[2].platoId).toBe(copias[3].platoId)
    expect(copias[0].platoId).not.toBe(copias[2].platoId)
    expect(copias[0].platoId).not.toBe((await db.entries.get(originales[0]))?.platoId)
    const borradas = await entriesRepo.borrarVarias(primera)
    expect((await entriesRepo.delDia(destino.fecha)).map((e) => e.id)).toEqual(segunda)
    await entriesRepo.restaurar(borradas)
    expect(await entriesRepo.delDia(destino.fecha)).toEqual(copias)
  })

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
  it.each(['comida', 'cena', 'snack'] as const)('copia solo el plato elegido de desayuno a %s en el mismo día', async (comidaDestino) => {
    const input = { fecha: '2026-10-03', comida: 'desayuno' as const, nombrePlato: 'Mi plato', items: [{ ...ARROZ, nutrientes: { fibra: 2, sal: 0.03, azucares: 0, agSat: 0.1 } }, { ...ARROZ, nombre: 'Pollo', catalogId: 'ciqual:36003' }] }
    const ids = await entriesRepo.guardarComida(input)
    await entriesRepo.guardarComida(input)
    await entriesRepo.guardarComida({ ...input, comida: comidaDestino })
    const antes = await db.entries.toArray()
    const originales = (await db.entries.bulkGet(ids)).map((e) => e!)
    // La copia usa los snapshots, aunque el alimento haya cambiado tras registrar el plato.
    await foodsRepo.actualizar(originales[0].foodId!, { ...POLLO, nombre: 'Arroz', kcal100: 999 })
    const foods = await db.foods.toArray()
    const nuevos = await entriesRepo.copiar({ origen: { fecha: input.fecha, comida: input.comida, platoId: originales[0].platoId }, destino: { fecha: input.fecha, comida: comidaDestino } })
    expect(nuevos).toHaveLength(2)
    const copias = (await db.entries.bulkGet(nuevos)).map((e) => e!)
    expect(copias[0].platoId).toBeDefined()
    expect(copias[0].platoId).toBe(copias[1].platoId)
    expect(antes.some((e) => e.platoId === copias[0].platoId)).toBe(false)
    for (const [i, copia] of copias.entries()) {
      expect(copia).toMatchObject({ ...originales[i], id: nuevos[i], comida: comidaDestino, createdAt: expect.any(Number), platoId: copias[0].platoId })
    }
    expect(await db.entries.bulkGet(antes.map((e) => e.id))).toEqual(antes)
    expect(await db.foods.toArray()).toEqual(foods)
    await entriesRepo.borrarVarias(nuevos)
    expect(await db.entries.toArray()).toEqual(antes)
  })

  it('copias sucesivas del mismo plato permanecen independientes y admite un único ingrediente', async () => {
    const ids = await entriesRepo.guardarComida({ fecha: '2026-10-03', comida: 'desayuno', items: [ARROZ, { ...ARROZ, nombre: 'Pollo' }], nombrePlato: 'Mi plato' })
    await entriesRepo.borrar(ids[1])
    const original = (await db.entries.get(ids[0]))!
    const input = { origen: { fecha: original.fecha, comida: original.comida, platoId: original.platoId }, destino: { fecha: original.fecha, comida: 'cena' as const } }
    const primera = await entriesRepo.copiar(input)
    const segunda = await entriesRepo.copiar(input)
    expect(primera).toHaveLength(1)
    expect(segunda).toHaveLength(1)
    expect((await db.entries.get(primera[0]))!.platoId).not.toBe((await db.entries.get(segunda[0]))!.platoId)
    expect(await db.entries.get(original.id)).toEqual(original)
  })

  it('copiar a la misma fecha/comida no duplica el plato', async () => {
    const ids = await entriesRepo.guardarComida({ fecha: '2026-10-03', comida: 'desayuno', items: [ARROZ, { ...ARROZ, nombre: 'Pollo' }] })
    const antes = await db.entries.toArray()
    expect(await entriesRepo.copiar({ origen: { fecha: '2026-10-03', comida: 'desayuno', platoId: antes[0].platoId }, destino: { fecha: '2026-10-03', comida: 'desayuno' } })).toEqual([])
    expect(await db.entries.bulkGet(ids)).toEqual(antes)
    expect(await db.entries.count()).toBe(2)
  })

  it.each(['borrado', 'otra fecha', 'otra comida', 'id vacío'] as const)('no copia otros platos si el origen está %s', async (caso) => {
    const input = { fecha: '2026-10-03', comida: 'desayuno' as const, items: [ARROZ, { ...ARROZ, nombre: 'Pollo' }] }
    const ids = await entriesRepo.guardarComida(input)
    await entriesRepo.guardarComida(input)
    const platoId = (await db.entries.get(ids[0]))!.platoId!
    if (caso === 'borrado') await entriesRepo.borrarVarias(ids)
    const antes = await db.entries.toArray()
    expect(await entriesRepo.copiar({ origen: { fecha: caso === 'otra fecha' ? '2026-10-02' : input.fecha, comida: caso === 'otra comida' ? 'cena' : input.comida, platoId: caso === 'id vacío' ? '' : platoId }, destino: { fecha: input.fecha, comida: 'comida' } })).toEqual([])
    expect(await db.entries.toArray()).toEqual(antes)
  })

  it('la copia de un plato a otro día también limita el origen al plato elegido', async () => {
    const input = { fecha: '2026-10-02', comida: 'desayuno' as const, items: [ARROZ, { ...ARROZ, nombre: 'Pollo' }] }
    const ids = await entriesRepo.guardarComida(input)
    await entriesRepo.guardarComida(input)
    const platoId = (await db.entries.get(ids[0]))!.platoId
    const nuevos = await entriesRepo.copiar({ origen: { fecha: input.fecha, comida: input.comida, platoId }, destino: { fecha: '2026-10-03', comida: 'cena' } })
    expect(nuevos).toHaveLength(2)
    expect(await entriesRepo.delDia(input.fecha)).toHaveLength(4)
    expect((await entriesRepo.delDia('2026-10-03')).every((e) => e.comida === 'cena' && e.platoId !== platoId)).toBe(true)
  })

  it('revierte las filas ya insertadas si falla la copia del plato', async () => {
    const ids = await entriesRepo.guardarComida({ fecha: '2026-10-03', comida: 'desayuno', items: [ARROZ, { ...ARROZ, nombre: 'Pollo' }] })
    const antes = await db.entries.toArray()
    const spy = vi.spyOn(db.entries, 'bulkAdd').mockImplementationOnce((items) => db.entries.add(items[0]).then(() => { throw new Error('fallo simulado') }) as never)
    try {
      await expect(entriesRepo.copiar({ origen: { fecha: '2026-10-03', comida: 'desayuno', platoId: antes[0].platoId }, destino: { fecha: '2026-10-03', comida: 'cena' } })).rejects.toThrow('fallo simulado')
    } finally { spy.mockRestore() }
    expect(await db.entries.bulkGet(ids)).toEqual(antes)
    expect(await db.entries.toArray()).toEqual(antes)
  })

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
