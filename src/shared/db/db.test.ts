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

describe('esquema v11', () => {
  it('instalación nueva: crea todas las tablas y los índices del catálogo, con la versión 11', async () => {
    const nombre = 'appfit-instalacion-test'
    const d = new AppFitDB(nombre)
    await d.open()
    expect(d.verno).toBe(11)
    expect(d.tables.map((t) => t.name).sort()).toEqual([...TABLAS_USUARIO, ...TABLAS_CATALOGO].sort())
    expect(d.table('catalogFoods').schema.primKey.auto).toBe(false)
    expect(d.table('catalogFoods').schema.idxByName.tok.multi).toBe(true)
    expect(d.table('catalogFoods').schema.idxByName.gtin.unique).toBeFalsy()
    expect(d.table('entries').schema.idxByName.catalogId).toBeDefined()
    expect(d.table('notasMedida').schema.primKey.auto).toBe(true)
    expect(d.table('pesos').schema.idxByName.fecha.unique).toBe(true)
    expect(d.table('porciones').schema.idxByName.ref).toBeDefined()
    expect(d.table('recetas').schema.idxByName.nombreNorm.unique).toBe(true)
    for (const t of ['agua', 'objetivosDia', 'medidas']) expect(d.table(t).schema.idxByName.fecha.unique, t).toBe(true)
    d.close()
    await Dexie.delete(nombre)
  })

  it('cada tabla es de usuario o de catálogo, y nunca de las dos', () => {
    const d = new AppFitDB('appfit-listas-test')
    const todas = d.tables.map((t) => t.name).sort()
    expect([...TABLAS_USUARIO, ...TABLAS_CATALOGO].sort()).toEqual(todas)
    expect(TABLAS_USUARIO.filter((t) => (TABLAS_CATALOGO as readonly string[]).includes(t))).toEqual([])
  })

  it('v2 → v11: foods, entries, meals y Gym sobreviven intactos; las tablas nuevas aparecen vacías', async () => {
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
    expect(actual.verno).toBe(11)
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

describe('migración v6 → v11', () => {
  it('conserva los datos existentes y crea las tablas nuevas vacías', async () => {
    const nombre = 'appfit-migracion-v6-test'
    const v6 = new Dexie(nombre)
    v6.version(1).stores(ESQUEMA_V1)
    v6.version(2).stores({ meals: '++id, usadoAt' })
    v6.version(3).stores({ entries: '++id, fecha, comida, foodId, catalogId, createdAt', catalogFoods: '&id, *tok, gtin, fuente', catalogSources: '&id' })
    v6.version(4).stores({ notasMedida: '++id, createdAt' })
    v6.version(5).stores({ pesos: '++id, &fecha' })
    v6.version(6).stores({ nombresAlimentos: '&id' })
    await v6.open()
    await v6.table('pesos').add({ fecha: '2026-10-01', kg: 70, createdAt: 1 })
    await v6.table('nombresAlimentos').add({ id: 'user:1', nombre: 'Pan' })
    await v6.table('workouts').add({ inicio: 5, fin: 9 })
    v6.close()

    const actual = new AppFitDB(nombre)
    await actual.open()
    expect(actual.verno).toBe(11)
    expect(await actual.pesos.count()).toBe(1)
    expect(await actual.nombresAlimentos.count()).toBe(1)
    expect((await actual.workouts.toArray())[0]).toMatchObject({ inicio: 5, fin: 9 })
    for (const t of ['porciones', 'recetas', 'agua', 'objetivosDia', 'medidas']) expect(await actual.table(t).count(), t).toBe(0)
    await actual.agua.add({ fecha: '2026-10-02', ml: 250 })
    await expect(actual.agua.add({ fecha: '2026-10-02', ml: 100 })).rejects.toThrow()
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
  it('v1 → v11: los datos existentes sobreviven y aparecen vacías las tablas nuevas', async () => {
    const nombre = 'appfit-migracion-test'
    const datos = JSON.parse(backupV1)

    const v1 = new Dexie(nombre)
    v1.version(1).stores(ESQUEMA_V1)
    await v1.open()
    for (const tabla of Object.keys(ESQUEMA_V1)) await v1.table(tabla).bulkAdd(datos[tabla])
    v1.close()

    const actual = new AppFitDB(nombre)
    await actual.open()
    expect(actual.verno).toBe(11)
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

describe('migración v7 → v11 (creatina)', () => {
  it('conserva todas las tablas antiguas y añade marcas únicas por tipo y fecha', async () => {
    const nombre = 'appfit-creatina-migracion-test'
    const esquemaV7 = {
      ...ESQUEMA_V2,
      entries: '++id, fecha, comida, foodId, catalogId, createdAt',
      catalogFoods: '&id, *tok, gtin, fuente', catalogSources: '&id',
      notasMedida: '++id, createdAt', pesos: '++id, &fecha', nombresAlimentos: '&id',
      porciones: '++id, ref', recetas: '++id, &nombreNorm, foodId',
      agua: '++id, &fecha', objetivosDia: '++id, &fecha', medidas: '++id, &fecha',
    }
    const anteriores = Object.keys(esquemaV7)
    const v7 = new Dexie(nombre)
    v7.version(7).stores(esquemaV7)
    await v7.open()
    const datos = JSON.parse(backupV1)
    for (const tabla of Object.keys(ESQUEMA_V1)) await v7.table(tabla).bulkAdd(datos[tabla])
    await v7.table('pesos').add({ fecha: '2026-10-12', kg: 80, createdAt: 1 })
    await v7.table('agua').add({ fecha: '2026-10-12', ml: 250 })
    const antes = Object.fromEntries(await Promise.all(anteriores.map(async t => [t, await v7.table(t).toArray()])))
    v7.close()
    const actual = new AppFitDB(nombre)
    await actual.open()
    expect(actual.verno).toBe(11)
    for (const t of anteriores) expect(await actual.table(t).toArray(), t).toEqual(antes[t])
    expect(await actual.suplementos.count()).toBe(0)
    const indice = actual.backendDB().transaction('suplementos', 'readonly').objectStore('suplementos').index('[tipo+fecha]')
    expect(indice.unique).toBe(true)
    expect(indice.keyPath).toEqual(['tipo', 'fecha'])
    await actual.suplementos.add({ tipo: 'creatina', fecha: '2026-10-12', createdAt: 1 })
    await expect(actual.suplementos.add({ tipo: 'creatina', fecha: '2026-10-12', createdAt: 2 })).rejects.toThrow()
    await actual.suplementos.add({ tipo: 'otro', fecha: '2026-10-12', createdAt: 2 })
    actual.close(); await Dexie.delete(nombre)
  })
})

describe('migración v8 → v11 (cheat day)', () => {
  it('conserva todas las tablas antiguas y añade cheatDays vacía con una marca por fecha', async () => {
    const nombre = 'appfit-cheat-day-migracion-test'
    const esquemaV8 = {
      ...ESQUEMA_V2,
      entries: '++id, fecha, comida, foodId, catalogId, createdAt',
      catalogFoods: '&id, *tok, gtin, fuente', catalogSources: '&id',
      notasMedida: '++id, createdAt', pesos: '++id, &fecha', nombresAlimentos: '&id',
      porciones: '++id, ref', recetas: '++id, &nombreNorm, foodId',
      agua: '++id, &fecha', objetivosDia: '++id, &fecha', medidas: '++id, &fecha',
      suplementos: '++id, fecha, &[tipo+fecha]',
    }
    const anteriores = Object.keys(esquemaV8)
    const v8 = new Dexie(nombre)
    v8.version(8).stores(esquemaV8)
    await v8.open()
    const datos = JSON.parse(backupV1)
    for (const tabla of Object.keys(ESQUEMA_V1)) await v8.table(tabla).bulkAdd(datos[tabla])
    await v8.table('suplementos').add({ tipo: 'creatina', fecha: '2026-10-12', createdAt: 1 })
    const antes = Object.fromEntries(await Promise.all(anteriores.map(async t => [t, await v8.table(t).toArray()])))
    v8.close()
    const actual = new AppFitDB(nombre)
    await actual.open()
    expect(actual.verno).toBe(11)
    for (const t of anteriores) expect(await actual.table(t).toArray(), t).toEqual(antes[t])
    expect(await actual.cheatDays.count()).toBe(0)
    await actual.cheatDays.add({ fecha: '2026-10-11', createdAt: 1 })
    await expect(actual.cheatDays.add({ fecha: '2026-10-11', createdAt: 2 })).rejects.toThrow()
    actual.close(); await Dexie.delete(nombre)
  })
})

describe('migración v9 → v11 (actividades)', () => {
  it('conserva todas las tablas antiguas y añade actividades vacía', async () => {
    const nombre = 'appfit-actividades-migracion-test'
    const esquemaV9 = {
      ...ESQUEMA_V2,
      entries: '++id, fecha, comida, foodId, catalogId, createdAt',
      catalogFoods: '&id, *tok, gtin, fuente', catalogSources: '&id',
      notasMedida: '++id, createdAt', pesos: '++id, &fecha', nombresAlimentos: '&id',
      porciones: '++id, ref', recetas: '++id, &nombreNorm, foodId',
      agua: '++id, &fecha', objetivosDia: '++id, &fecha', medidas: '++id, &fecha',
      suplementos: '++id, fecha, &[tipo+fecha]', cheatDays: '++id, &fecha',
    }
    const anteriores = Object.keys(esquemaV9)
    const v9 = new Dexie(nombre)
    v9.version(9).stores(esquemaV9)
    await v9.open()
    const datos = JSON.parse(backupV1)
    for (const tabla of Object.keys(ESQUEMA_V1)) await v9.table(tabla).bulkAdd(datos[tabla])
    await v9.table('cheatDays').add({ fecha: '2026-10-11', createdAt: 1 })
    const antes = Object.fromEntries(await Promise.all(anteriores.map(async t => [t, await v9.table(t).toArray()])))
    v9.close()
    const actual = new AppFitDB(nombre)
    await actual.open()
    expect(actual.verno).toBe(11)
    for (const t of anteriores) expect(await actual.table(t).toArray(), t).toEqual(antes[t])
    expect(await actual.actividades.count()).toBe(0)
    await actual.actividades.add({ tipo: 'caminar', fecha: '2026-10-12', inicio: 1, duracionSeg: 600, distanciaM: 1000, origen: 'manual', createdAt: 1 })
    expect(await actual.actividades.where('fecha').equals('2026-10-12').count()).toBe(1)
    actual.close(); await Dexie.delete(nombre)
  })
})

describe('migración v10 → v11 (rutas propias)', () => {
  it('conserva las actividades y añade rutasPropias vacía', async () => {
    const nombre = 'appfit-rutas-propias-migracion-test'
    const esquemaV10 = {
      ...ESQUEMA_V2,
      entries: '++id, fecha, comida, foodId, catalogId, createdAt',
      catalogFoods: '&id, *tok, gtin, fuente', catalogSources: '&id',
      notasMedida: '++id, createdAt', pesos: '++id, &fecha', nombresAlimentos: '&id',
      porciones: '++id, ref', recetas: '++id, &nombreNorm, foodId',
      agua: '++id, &fecha', objetivosDia: '++id, &fecha', medidas: '++id, &fecha',
      suplementos: '++id, fecha, &[tipo+fecha]', cheatDays: '++id, &fecha', actividades: '++id, fecha, inicio',
    }
    const v10 = new Dexie(nombre)
    v10.version(10).stores(esquemaV10)
    await v10.open()
    await v10.table('actividades').add({ tipo: 'caminar', fecha: '2026-10-12', inicio: 1, duracionSeg: 600, distanciaM: 1000, origen: 'manual', createdAt: 1 })
    const antes = await v10.table('actividades').toArray()
    v10.close()
    const actual = new AppFitDB(nombre)
    await actual.open()
    expect(actual.verno).toBe(11)
    expect(await actual.actividades.toArray()).toEqual(antes)
    expect(await actual.rutasPropias.count()).toBe(0)
    actual.close(); await Dexie.delete(nombre)
  })
})
