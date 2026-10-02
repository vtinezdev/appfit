import Dexie from 'dexie'
import { afterAll, describe, expect, it } from 'vitest'
import backupV1 from '../../test/fixtures/backup-v1.json?raw'
import { AppFitDB, TABLAS_CATALOGO, TABLAS_USUARIO } from './db'
import type { CatalogFood, Meal } from './types'

// Esquema v1 tal como lo dejó la sesión 01 (el que tiene hoy la app instalada en el móvil). No se toca nunca.
const ESQUEMA_V1 = {
  foods: '++id, &nombreNorm, nombre, fuente, updatedAt',
  entries: '++id, fecha, comida, foodId, createdAt',
  settings: 'id',
  exercises: '++id, &nombreNorm, nombre, grupo',
  routines: '++id, nombre',
  workouts: '++id, inicio, fin, routineId',
  sets: '++id, workoutId, exerciseId, [exerciseId+createdAt], orden, createdAt',
}

const ESQUEMA_V2 = { ...ESQUEMA_V1, meals: '++id, usadoAt' }

function catalogFood(over: Partial<CatalogFood> = {}): CatalogFood {
  return {
    id: 'usda:171077', fuente: 'usda', idExterno: '171077', nombre: 'Pollo, pechuga, cruda', nombreOriginal: 'Chicken breast, raw',
    nombreNorm: 'pollo, pechuga, cruda', tok: ['pollo', 'pechuga', 'cruda'], tipo: 'generico',
    kcal100: 120, prot100: 22.5, carb100: 0, grasa100: 2.6, version: '2026.1', importadoAt: 1, ...over,
  }
}

const meal: Omit<Meal, 'id'> = {
  nombre: 'Desayuno', comida: 'desayuno', usos: 2, usadoAt: 5, createdAt: 1,
  items: [{ foodId: 1, nombre: 'Plátano', gramos: 100, kcal: 89, prot: 1, carb: 23, grasa: 0.3 }],
}

describe('esquema v6', () => {
  it('instalación nueva: crea todas las tablas y los índices del catálogo, con la versión 6', async () => {
    const nombre = 'appfit-instalacion-test'
    const d = new AppFitDB(nombre)
    await d.open()
    expect(d.verno).toBe(6)
    expect(d.tables.map((t) => t.name).sort()).toEqual([...TABLAS_USUARIO, ...TABLAS_CATALOGO].sort())
    expect(d.table('catalogFoods').schema.primKey.auto).toBe(false)
    expect(d.table('catalogFoods').schema.idxByName.tok.multi).toBe(true)
    expect(d.table('catalogFoods').schema.idxByName.gtin.unique).toBeFalsy()
    expect(d.table('entries').schema.idxByName.catalogId).toBeDefined()
    expect(d.table('notasMedida').schema.primKey.auto).toBe(true)
    expect(d.table('pesos').schema.idxByName.fecha.unique).toBe(true)
    d.close()
    await Dexie.delete(nombre)
  })

  it('cada tabla es de usuario o de catálogo, y nunca de las dos', () => {
    const d = new AppFitDB('appfit-listas-test')
    const todas = d.tables.map((t) => t.name).sort()
    expect([...TABLAS_USUARIO, ...TABLAS_CATALOGO].sort()).toEqual(todas)
    expect(TABLAS_USUARIO.filter((t) => (TABLAS_CATALOGO as readonly string[]).includes(t))).toEqual([])
  })

  it('v2 → v6: foods, entries, meals y Gym sobreviven intactos; las tablas nuevas aparecen vacías', async () => {
    const nombre = 'appfit-migracion-v2-test'
    const datos = JSON.parse(backupV1)

    const v2 = new Dexie(nombre)
    v2.version(1).stores(ESQUEMA_V1)
    v2.version(2).stores({ meals: '++id, usadoAt' })
    await v2.open()
    for (const tabla of Object.keys(ESQUEMA_V1)) await v2.table(tabla).bulkAdd(datos[tabla])
    await v2.table('meals').add(meal)
    await v2.table('entries').add({ fecha: '2026-09-29', comida: 'snack', nombre: 'Kcal rápidas', gramos: 0, kcal: 300, prot: 0, carb: 0, grasa: 0, createdAt: 9, rapida: true })
    const antes = Object.fromEntries(await Promise.all(Object.keys(ESQUEMA_V2).map(async (t) => [t, await v2.table(t).toArray()])))
    v2.close()

    const actual = new AppFitDB(nombre)
    await actual.open()
    expect(actual.verno).toBe(6)
    // Ningún registro cambia: contenido idéntico (incluido Gym y meals).
    for (const tabla of Object.keys(ESQUEMA_V2)) expect(await actual.table(tabla).toArray(), tabla).toEqual(antes[tabla])
    expect(antes.foods).toHaveLength(datos.foods.length)
    expect(antes.sets).toHaveLength(datos.sets.length)
    expect(antes.meals).toHaveLength(1)
    expect(await actual.catalogFoods.count()).toBe(0)
    expect(await actual.catalogSources.count()).toBe(0)
    expect(await actual.notasMedida.count()).toBe(0)
    expect(await actual.pesos.count()).toBe(0)
    // Evidencia de que Dexie ha creado de verdad tablas e índices en la IndexedDB migrada (no solo en su esquema en memoria).
    const idb = actual.backendDB()
    const tx = idb.transaction(['entries', 'catalogFoods'], 'readonly')
    expect(tx.objectStore('entries').indexNames.contains('catalogId')).toBe(true)
    const catalogo = tx.objectStore('catalogFoods')
    expect(catalogo.keyPath).toBe('id')
    expect(catalogo.autoIncrement).toBe(false)
    expect(catalogo.index('tok').multiEntry).toBe(true)
    expect(catalogo.index('gtin').unique).toBe(false)
    expect([...catalogo.indexNames].sort()).toEqual(['fuente', 'gtin', 'tok'])
    // Los índices antiguos y el nuevo funcionan sobre datos previos.
    expect((await actual.foods.where('nombreNorm').equals('platano').first())?.id).toBe(1)
    expect(await actual.entries.where('fecha').equals('2026-09-29').count()).toBe(1)
    expect(await actual.entries.where('catalogId').equals('usda:1').count()).toBe(0)
    expect((await actual.sets.where('[exerciseId+createdAt]').between([0, 0], [99, Infinity]).count())).toBe(datos.sets.length)
    // Y se puede seguir escribiendo en todo.
    await actual.entries.add({ fecha: '2026-09-30', comida: 'cena', catalogId: 'usda:1', nombre: 'X', gramos: 1, kcal: 1, prot: 0, carb: 0, grasa: 0, createdAt: 1 })
    expect(await actual.entries.where('catalogId').equals('usda:1').count()).toBe(1)
    actual.close()
    await Dexie.delete(nombre)
  })
})

describe('catálogo en Dexie', () => {
  const nombre = 'appfit-catalogo-test'
  const d = new AppFitDB(nombre)
  afterAll(async () => {
    d.close()
    await Dexie.delete(nombre)
  })

  it('se puede crear un catalogFood, y las entries lo referencian sin depender de él', async () => {
    await d.catalogFoods.put(catalogFood())
    expect((await d.catalogFoods.get('usda:171077'))?.nombreOriginal).toBe('Chicken breast, raw')

    const id = await d.entries.add({
      fecha: '2026-09-29', comida: 'comida', catalogId: 'usda:171077', nombre: 'Pollo, pechuga, cruda', gramos: 150,
      kcal: 180, prot: 33.8, carb: 0, grasa: 3.9, createdAt: 1,
    })
    expect(await d.entries.where('catalogId').equals('usda:171077').count()).toBe(1)

    // El catálogo cambia y luego desaparece: el histórico sigue igual y legible.
    await d.catalogFoods.put(catalogFood({ kcal100: 999, version: '2026.2' }))
    expect(await d.entries.get(id)).toMatchObject({ kcal: 180, prot: 33.8, nombre: 'Pollo, pechuga, cruda', catalogId: 'usda:171077' })
    await d.catalogFoods.clear()
    expect(await d.entries.get(id)).toMatchObject({ kcal: 180, prot: 33.8, grasa: 3.9, gramos: 150, nombre: 'Pollo, pechuga, cruda' })
  })

  it('nutrientes: distingue 0 conocido de desconocido, y no exige unicidad de nombre ni de GTIN', async () => {
    await d.catalogFoods.bulkPut([
      catalogFood({ id: 'off:1', fuente: 'off', idExterno: '1', gtin: '8410000000001', nutrientes: { FIBTG: 0 } }),
      catalogFood({ id: 'off:2', fuente: 'off', idExterno: '2', gtin: '8410000000001' }),
    ])
    const [a, b] = await d.catalogFoods.bulkGet(['off:1', 'off:2'])
    expect(a?.nutrientes).toEqual({ FIBTG: 0 })
    expect(a?.nutrientes && 'FIBTG' in a.nutrientes).toBe(true)
    expect(b?.nutrientes).toBeUndefined()
    expect(await d.catalogFoods.where('gtin').equals('8410000000001').count()).toBe(2)
  })
})

describe('migraciones de Dexie', () => {
  it('v1 → v6: los datos existentes sobreviven y aparecen vacías las tablas nuevas', async () => {
    const nombre = 'appfit-migracion-test'
    const datos = JSON.parse(backupV1)

    const v1 = new Dexie(nombre)
    v1.version(1).stores(ESQUEMA_V1)
    await v1.open()
    for (const tabla of Object.keys(ESQUEMA_V1)) await v1.table(tabla).bulkAdd(datos[tabla])
    v1.close()

    const actual = new AppFitDB(nombre)
    await actual.open()
    expect(actual.verno).toBe(6)
    expect(await actual.catalogFoods.count()).toBe(0)
    for (const tabla of Object.keys(ESQUEMA_V1)) {
      expect(await actual.table(tabla).count(), tabla).toBe(datos[tabla].length)
    }
    expect(await actual.entries.get(9)).toEqual(datos.entries[8])
    expect(await actual.meals.count()).toBe(0)
    expect(await actual.notasMedida.count()).toBe(0)
    expect(await actual.pesos.count()).toBe(0)
    // Los índices de v1 siguen funcionando.
    expect((await actual.foods.where('nombreNorm').equals('platano').first())?.id).toBe(1)
    actual.close()
    await Dexie.delete(nombre)
  })
})
