import { beforeEach, describe, expect, it } from 'vitest'
import backupV1 from '../../test/fixtures/backup-v1.json?raw'
import { db } from '../db/db'
import type { CatalogFood } from '../db/types'
import { BackupError, borrarTodosLosDatos, exportarBackup, importarBackup, migrarBackup } from './backup'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

async function recuentos(): Promise<Record<string, number>> {
  const r: Record<string, number> = {}
  for (const t of db.tables) r[t.name] = await t.count()
  return r
}

function v1ConApiKey(apiKey: string): string {
  const data = JSON.parse(backupV1)
  data.settings[0].apiKey = apiKey
  return JSON.stringify(data)
}

describe('importarBackup', () => {
  it('importa entero el backup v1 de referencia (generado con el código de la sesión 01)', async () => {
    await importarBackup(backupV1)
    expect(await recuentos()).toEqual({ foods: 4, entries: 9, settings: 1, exercises: 2, routines: 1, workouts: 1, sets: 5, meals: 0, notasMedida: 0, pesos: 0, catalogFoods: 0, catalogSources: 0 })
    expect((await db.foods.get(1))?.nombre).toBe('Plátano')
    expect(await db.entries.get(9)).toMatchObject({ fecha: '2026-09-28', comida: 'cena', kcal: 330, textoOriginal: 'pollo a la plancha' })
  })

  it('sustituye los datos que hubiera antes', async () => {
    await db.foods.add({ nombre: 'Viejo', nombreNorm: 'viejo', kcal100: 1, prot100: 0, carb100: 0, grasa100: 0, fuente: 'manual', updatedAt: 0 })
    await importarBackup(backupV1)
    expect(await db.foods.where('nombreNorm').equals('viejo').count()).toBe(0)
  })

  it('vacía también las tablas que el backup no trae (un v1 no tiene plantillas)', async () => {
    await db.meals.add({ nombre: 'Desayuno', items: [], usos: 0, usadoAt: 0, createdAt: 0 })
    await importarBackup(backupV1)
    expect(await db.meals.count()).toBe(0)
  })

  it('descarta la API key y el modelo de un backup antiguo (la IA se retiró)', async () => {
    await importarBackup(v1ConApiKey('clave-backup'))
    const s = await db.settings.get(1)
    expect(s).not.toHaveProperty('apiKey')
    expect(s).not.toHaveProperty('modelo')
  })

  it('rechaza un JSON inválido', async () => {
    await expect(importarBackup('{no es json')).rejects.toThrow(/JSON válido/)
  })

  it('rechaza un JSON que no tiene forma de backup y no toca los datos', async () => {
    await importarBackup(backupV1)
    await expect(importarBackup('{"version": 1}')).rejects.toThrow(/formato de backup/)
    expect(await db.foods.count()).toBe(4)
  })
})

describe('exportarBackup', () => {
  it('exportar e importar conserva platos e ingredientes en entradas y plantillas sin cambiar la versión', async () => {
    await importarBackup(backupV1)
    await db.entries.update(8, { platoId: 'plato-cena', nombrePlato: 'Mi cena' })
    await db.entries.update(9, { platoId: 'plato-cena', nombrePlato: 'Mi cena' })
    const entries = (await db.entries.bulkGet([8, 9])).map((e) => e!)
    await db.meals.add({ nombre: 'Cena', items: entries.map(({ id: _id, fecha: _fecha, comida: _comida, createdAt: _createdAt, ...item }) => item), usos: 0, usadoAt: 1, createdAt: 1 })
    const antes = await exportarBackup()
    expect(antes.version).toBe(2)
    await importarBackup(JSON.stringify(antes))
    const despues = await exportarBackup()
    expect(despues.entries).toEqual(antes.entries)
    expect(despues.meals).toEqual(antes.meals)
    expect((await db.entries.get(1))?.platoId).toBeUndefined()
  })

  it('exporta la versión actual sin la API key antigua', async () => {
    await importarBackup(v1ConApiKey('secreta'))
    const b = await exportarBackup()
    expect(b.version).toBe(2)
    expect(b.dbVersion).toBe(db.verno)
    expect(b.settings[0]).not.toHaveProperty('apiKey')
    expect(JSON.stringify(b)).not.toContain('secreta')
  })

  it('ida y vuelta v2 sin perder datos (plantillas, notas de medidas y pesos incluidos)', async () => {
    await importarBackup(backupV1)
    await db.meals.add({ nombre: 'Desayuno', comida: 'desayuno', items: [{ foodId: 4, nombre: 'Yogur natural', gramos: 125, kcal: 76.3, prot: 4.4, carb: 5.9, grasa: 4.1 }], usos: 2, usadoAt: 5, createdAt: 1 })
    await db.notasMedida.add({ texto: 'tarrina de hummus ≈ 200 g', createdAt: 3 })
    await db.pesos.bulkAdd([
      { fecha: '2026-09-22', kg: 72.4, createdAt: 10 },
      { fecha: '2026-09-29', kg: 71.8, createdAt: 11 },
    ])
    const antes = await exportarBackup()
    expect(antes.pesos).toHaveLength(2)
    await Promise.all(db.tables.map((t) => t.clear()))
    await importarBackup(JSON.stringify(antes))
    const despues = await exportarBackup()
    expect({ ...despues, exportedAt: '' }).toEqual({ ...antes, exportedAt: '' })
    expect(await db.pesos.count()).toBe(2)
  })

  it('un backup antiguo sin `pesos` importa con la tabla vacía (y vacía los pesos que hubiera)', async () => {
    await db.pesos.add({ fecha: '2026-09-01', kg: 70, createdAt: 1 })
    await importarBackup(backupV1)
    expect(await db.pesos.count()).toBe(0)
  })
})

describe('migrarBackup', () => {
  it('lleva un v1 a v2 sin cambiar los registros', () => {
    const v1 = JSON.parse(backupV1)
    const v2 = migrarBackup(v1)
    expect(v2).toMatchObject({ version: 2, dbVersion: 1, exportedAt: v1.exportedAt })
    expect(v2.entries).toEqual(v1.entries)
    expect(v2.sets).toEqual(v1.sets)
    expect(v2.meals).toEqual([])
    expect(v2.notasMedida).toEqual([])
    expect(v2.pesos).toEqual([])
  })

  it('rechaza una tabla opcional con forma incorrecta', () => {
    expect(() => migrarBackup({ ...JSON.parse(backupV1), version: 2, meals: 'no' })).toThrow(BackupError)
    expect(() => migrarBackup({ ...JSON.parse(backupV1), version: 2, notasMedida: {} })).toThrow(BackupError)
    expect(() => migrarBackup({ ...JSON.parse(backupV1), version: 2, pesos: 'no' })).toThrow(BackupError)
  })

  it('rechaza backups de una versión más nueva con un mensaje claro', () => {
    expect(() => migrarBackup({ ...JSON.parse(backupV1), version: 3 })).toThrow(/versión más nueva/)
  })

  it('rechaza backups a los que les falta una tabla obligatoria o con forma desconocida', () => {
    const { sets: _sets, ...sinSets } = JSON.parse(backupV1)
    expect(() => migrarBackup(sinSets)).toThrow(BackupError)
    expect(() => migrarBackup({ ...JSON.parse(backupV1), version: 'uno' })).toThrow(BackupError)
    expect(() => migrarBackup(null)).toThrow(BackupError)
  })
})

const CATALOGO: CatalogFood = {
  id: 'usda:1', fuente: 'usda', idExterno: '1', nombre: 'Pollo', nombreNorm: 'pollo', tok: ['pollo'], tipo: 'generico',
  kcal100: 120, prot100: 22, carb100: 0, grasa100: 2, version: '1', importadoAt: 1,
}

async function sembrarCatalogo(): Promise<void> {
  await db.catalogFoods.put(CATALOGO)
  await db.catalogSources.put({ id: 'usda', version: '1', importadoAt: 1, licencia: 'CC0', atribucion: 'USDA', filas: 1 })
}

describe('el catálogo queda fuera de los datos del usuario', () => {
  it('el backup no incluye el catálogo (ni en las claves ni en el JSON)', async () => {
    await importarBackup(backupV1)
    await sembrarCatalogo()
    const b = await exportarBackup()
    expect(Object.keys(b)).not.toContain('catalogFoods')
    expect(Object.keys(b)).not.toContain('catalogSources')
    expect(JSON.stringify(b)).not.toContain('usda:1')
  })

  it('el backup conserva catalogId (con su snapshot) y se restaura sin catálogo', async () => {
    await importarBackup(backupV1)
    await db.entries.add({ fecha: '2026-09-29', comida: 'comida', catalogId: 'usda:1', nombre: 'Pollo', gramos: 150, kcal: 180, prot: 33, carb: 0, grasa: 3, createdAt: 1 })
    const json = JSON.stringify(await exportarBackup())
    await borrarTodosLosDatos()
    await importarBackup(json)
    expect(await db.catalogFoods.count()).toBe(0)
    expect(await db.entries.where('catalogId').equals('usda:1').first()).toMatchObject({ kcal: 180, nombre: 'Pollo' })
  })

  it('importar un backup no borra ni modifica el catálogo', async () => {
    await sembrarCatalogo()
    await importarBackup(backupV1)
    expect(await db.catalogFoods.get('usda:1')).toEqual(CATALOGO)
    expect(await db.catalogSources.count()).toBe(1)
  })

  it('un backup fallido tampoco toca el catálogo', async () => {
    await sembrarCatalogo()
    await expect(importarBackup('{"version": 1}')).rejects.toThrow(BackupError)
    expect(await db.catalogFoods.count()).toBe(1)
  })

  it('borrar todos los datos vacía lo del usuario y conserva el catálogo', async () => {
    await importarBackup(backupV1)
    await db.meals.add({ nombre: 'Desayuno', items: [], usos: 0, usadoAt: 0, createdAt: 0 })
    await sembrarCatalogo()
    await borrarTodosLosDatos()
    for (const t of ['foods', 'entries', 'meals', 'settings', 'exercises', 'routines', 'workouts', 'sets', 'notasMedida', 'pesos']) {
      expect(await db.table(t).count(), t).toBe(0)
    }
    expect(await db.catalogFoods.count()).toBe(1)
    expect(await db.catalogSources.count()).toBe(1)
  })

  it('los backups v1 existentes siguen importándose (versión del formato sin cambios)', () => {
    expect(migrarBackup(JSON.parse(backupV1)).version).toBe(2)
  })
})
