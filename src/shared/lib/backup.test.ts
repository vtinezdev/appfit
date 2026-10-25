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
    expect(await recuentos()).toEqual({ foods: 4, entries: 9, settings: 1, exercises: 2, routines: 1, workouts: 1, sets: 5, meals: 0, notasMedida: 0, pesos: 0, nombresAlimentos: 0, porciones: 0, recetas: 0, agua: 0, objetivosDia: 0, medidas: 0, suplementos: 0, cheatDays: 0, actividades: 0, rutasPropias: 0, pasos: 0, gimnasios: 0, planificadas: 0, catalogFoods: 0, catalogSources: 0 })
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

/** Importar anota `ultimaExportacion`; para comparar ida y vuelta se ignora ese campo y la hora del export. */
const sinFechaCopia = (b: Awaited<ReturnType<typeof exportarBackup>>) => ({ ...b, exportedAt: '', settings: b.settings.map(({ ultimaExportacion: _u, ...r }) => r) })

describe('exportarBackup', () => {
  it('exportar e importar conserva platos e ingredientes en entradas y plantillas sin cambiar la versión', async () => {
    await importarBackup(backupV1)
    await db.entries.update(8, { platoId: 'plato-cena', nombrePlato: 'Mi cena' })
    await db.entries.update(9, { platoId: 'plato-cena', nombrePlato: 'Mi cena' })
    const entries = (await db.entries.bulkGet([8, 9])).map((e) => e!)
    await db.meals.add({ nombre: 'Cena', items: entries.map(({ id: _id, fecha: _fecha, comida: _comida, createdAt: _createdAt, ...item }) => item), usos: 0, usadoAt: 1, createdAt: 1 })
    const antes = await exportarBackup()
    expect(antes.version).toBe(3)
    await importarBackup(JSON.stringify(antes))
    const despues = await exportarBackup()
    expect(despues.entries).toEqual(antes.entries)
    expect(despues.meals).toEqual(antes.meals)
    expect((await db.entries.get(1))?.platoId).toBeUndefined()
  })

  it('exporta la versión actual sin la API key antigua', async () => {
    await importarBackup(v1ConApiKey('secreta'))
    const b = await exportarBackup()
    expect(b.version).toBe(3)
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
    expect(sinFechaCopia(despues)).toEqual(sinFechaCopia(antes))
    expect(await db.pesos.count()).toBe(2)
  })

  it('un backup antiguo sin `pesos` importa con la tabla vacía (y vacía los pesos que hubiera)', async () => {
    await db.pesos.add({ fecha: '2026-09-01', kg: 70, createdAt: 1 })
    await importarBackup(backupV1)
    expect(await db.pesos.count()).toBe(0)
  })
})

describe('ultimaExportacion al importar', () => {
  it('queda como exportedAt del backup, o la que trae si exportedAt no es válida', async () => {
    const base = JSON.parse(backupV1)
    await importarBackup(JSON.stringify({ ...base, version: 2, exportedAt: '2026-09-20T10:00:00.000Z' }))
    expect((await db.settings.get(1))?.ultimaExportacion).toBe(Date.parse('2026-09-20T10:00:00.000Z'))
    await importarBackup(JSON.stringify({ ...base, version: 2, exportedAt: 'no es fecha', settings: [{ ...base.settings[0], ultimaExportacion: 12345 }] }))
    expect((await db.settings.get(1))?.ultimaExportacion).toBe(12345)
    await importarBackup(JSON.stringify({ ...base, version: 2, exportedAt: '' }))
    expect((await db.settings.get(1))?.ultimaExportacion).toBeUndefined()
  })
})

describe('backup v3', () => {
  it('ida y vuelta con las tablas nuevas', async () => {
    await importarBackup(backupV1)
    await db.porciones.add({ ref: 'user:1', nombre: 'rebanada', nombreNorm: 'rebanada', gramos: 30 })
    await db.agua.add({ fecha: '2026-10-01', ml: 500 })
    await db.medidas.add({ fecha: '2026-10-01', cintura: 80 })
    await db.objetivosDia.add({ fecha: '2026-10-01', objetivos: { kcal: 2000, prot: 150, carb: 200, grasa: 60 }, origen: 'test' })
    await db.recetas.add({ nombre: 'Guiso', nombreNorm: 'guiso', ingredientes: [], pesoCocinadoG: 500, foodId: 1, createdAt: 1, updatedAt: 1 })
    const antes = await exportarBackup()
    await Promise.all(db.tables.map((t) => t.clear()))
    await importarBackup(JSON.stringify(antes))
    const despues = await exportarBackup()
    expect(sinFechaCopia(despues)).toEqual(sinFechaCopia(antes))
    expect(await db.porciones.count()).toBe(1)
    expect(await db.recetas.count()).toBe(1)
  })

  it('importar un v2 vacía las tablas nuevas y sigue funcionando', async () => {
    await db.agua.add({ fecha: '2026-10-01', ml: 250 })
    const v2 = { ...JSON.parse(backupV1), version: 2 }
    await importarBackup(JSON.stringify(v2))
    expect(await db.agua.count()).toBe(0)
    expect(await db.foods.count()).toBeGreaterThan(0)
  })
})

describe('migrarBackup', () => {
  it('lleva un v1 a v2 sin cambiar los registros', () => {
    const v1 = JSON.parse(backupV1)
    const v2 = migrarBackup(v1)
    expect(v2).toMatchObject({ version: 3, dbVersion: 1, exportedAt: v1.exportedAt })
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
    expect(() => migrarBackup({ ...JSON.parse(backupV1), version: 4 })).toThrow(/versión más nueva/)
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
    expect(migrarBackup(JSON.parse(backupV1)).version).toBe(3)
  })
})

describe('backup de suplementos', () => {
  it('mantiene backup v3 y conserva marcas, configuración y otras tablas al importar', async () => {
    await importarBackup(backupV1)
    await db.settings.update(1, { creatina: { activa: true, dosisManualG: 4.5, inicioCarga: '2026-10-12' } })
    await db.suplementos.bulkAdd([{ tipo: 'creatina', fecha: '2026-10-12', createdAt: 10 }, { tipo: 'otro', fecha: '2026-10-12', createdAt: 11 }])
    const antes = await exportarBackup()
    expect(antes.version).toBe(3)
    expect(antes.dbVersion).toBe(14)
    await importarBackup(JSON.stringify(antes))
    expect(sinFechaCopia(await exportarBackup())).toEqual(sinFechaCopia(antes))
  })
  it('un backup antiguo importa suplementos vacíos y Creatina desactivada', async () => {
    await db.settings.put({ id: 1, objetivos: { kcal: 2200, prot: 150, carb: 238, grasa: 72 }, creatina: { activa: true } })
    await db.suplementos.add({ tipo: 'creatina', fecha: '2026-10-12', createdAt: 1 })
    await importarBackup(backupV1)
    expect(await db.suplementos.count()).toBe(0)
    expect((await db.settings.get(1))?.creatina).toBeUndefined()
  })
  it('rechaza marcas duplicadas sin perder los registros existentes', async () => {
    await importarBackup(backupV1)
    const antes = await exportarBackup()
    const mala = { ...antes, suplementos: [{ id: 1, tipo: 'creatina', fecha: '2026-10-12', createdAt: 1 }, { id: 2, tipo: 'creatina', fecha: '2026-10-12', createdAt: 2 }] }
    await expect(importarBackup(JSON.stringify(mala))).rejects.toThrow()
    expect(sinFechaCopia(await exportarBackup())).toEqual(sinFechaCopia(antes))
    expect(() => migrarBackup({ ...antes, suplementos: {} })).toThrow(BackupError)
  })
  it('borrar todos los datos incluye suplementos', async () => {
    await db.suplementos.add({ tipo: 'creatina', fecha: '2026-10-12', createdAt: 1 })
    await borrarTodosLosDatos()
    expect(await db.suplementos.count()).toBe(0)
  })
})

describe('backup de cheat days', () => {
  it('ida y vuelta: las marcas sobreviven a exportar e importar', async () => {
    await importarBackup(backupV1)
    await db.cheatDays.bulkAdd([{ fecha: '2026-10-10', createdAt: 1 }, { fecha: '2026-10-11', createdAt: 2 }])
    const antes = await exportarBackup()
    expect(antes.cheatDays).toHaveLength(2)
    await importarBackup(JSON.stringify(antes))
    expect(sinFechaCopia(await exportarBackup())).toEqual(sinFechaCopia(antes))
  })
  it('un backup antiguo sin cheatDays las deja vacías', async () => {
    await db.cheatDays.add({ fecha: '2026-10-11', createdAt: 1 })
    await importarBackup(backupV1)
    expect(await db.cheatDays.count()).toBe(0)
  })
  it('borrar todos los datos incluye los cheat days', async () => {
    await db.cheatDays.add({ fecha: '2026-10-11', createdAt: 1 })
    await borrarTodosLosDatos()
    expect(await db.cheatDays.count()).toBe(0)
  })
})

describe('backup de actividades', () => {
  const actividad = { tipo: 'senderismo' as const, fecha: '2026-10-11', inicio: 1, duracionSeg: 3600, distanciaM: 8000, desnivelM: 420, origen: 'gpx' as const, recorrido: [[[43.1, -8.2, 100], [43.11, -8.21, 120]]] as [number, number, number][][], createdAt: 1 }
  it('ida y vuelta: las actividades y su recorrido sobreviven a exportar e importar', async () => {
    await importarBackup(backupV1)
    await db.actividades.add(actividad)
    const antes = await exportarBackup()
    expect(antes.actividades).toHaveLength(1)
    await importarBackup(JSON.stringify(antes))
    expect(sinFechaCopia(await exportarBackup())).toEqual(sinFechaCopia(antes))
  })
  it('un backup antiguo sin actividades las deja vacías', async () => {
    await db.actividades.add(actividad)
    await importarBackup(backupV1)
    expect(await db.actividades.count()).toBe(0)
  })
  it('borrar todos los datos incluye las actividades', async () => {
    await db.actividades.add(actividad)
    await borrarTodosLosDatos()
    expect(await db.actividades.count()).toBe(0)
  })
})

describe('backup de rutas propias', () => {
  it('ida y vuelta, y un backup antiguo las deja vacías', async () => {
    await importarBackup(backupV1)
    await db.rutasPropias.add({ nombre: 'Tarragona – Valencia', salida: { nombre: 'Tarragona', lat: 41.1, lon: 1.2 }, etapas: [{ nombre: 'Valencia', km: 260 }], createdAt: 1, updatedAt: 1 })
    const antes = await exportarBackup()
    expect(antes.rutasPropias).toHaveLength(1)
    await importarBackup(JSON.stringify(antes))
    expect(sinFechaCopia(await exportarBackup())).toEqual(sinFechaCopia(antes))
    await importarBackup(backupV1)
    expect(await db.rutasPropias.count()).toBe(0)
  })
})

describe('backup de gimnasios', () => {
  it('ida y vuelta con el gimnasio de entrenos y series, y un backup antiguo los deja vacíos', async () => {
    await importarBackup(backupV1)
    const gimnasioId = await db.gimnasios.add({ nombre: 'Gym Playa', nombreNorm: 'gym playa' } as never)
    const workoutId = await db.workouts.add({ inicio: 1, fin: 2, gimnasioId } as never)
    await db.sets.add({ workoutId, exerciseId: 1, orden: 0, reps: 10, peso: 50, createdAt: 1, gimnasioId } as never)
    const antes = await exportarBackup()
    expect(antes.gimnasios).toHaveLength(1)
    await importarBackup(JSON.stringify(antes))
    expect(sinFechaCopia(await exportarBackup())).toEqual(sinFechaCopia(antes))
    expect((await db.sets.where('workoutId').equals(workoutId).first())?.gimnasioId).toBe(gimnasioId)
    await importarBackup(backupV1)
    expect(await db.gimnasios.count()).toBe(0)
  })
})

describe('backup de comidas planificadas', () => {
  it('ida y vuelta, y un backup antiguo las deja vacías', async () => {
    await importarBackup(backupV1)
    await db.planificadas.add({ fecha: '2026-10-25', comida: 'comida', nombre: 'Arroz', gramos: 120, kcal: 156, prot: 3, carb: 34, grasa: 0.4, createdAt: 1 } as never)
    const antes = await exportarBackup()
    expect(antes.planificadas).toHaveLength(1)
    await importarBackup(JSON.stringify(antes))
    expect(sinFechaCopia(await exportarBackup())).toEqual(sinFechaCopia(antes))
    await importarBackup(backupV1)
    expect(await db.planificadas.count()).toBe(0)
  })
})

describe('backup de pasos', () => {
  it('ida y vuelta, y un backup antiguo los deja vacíos', async () => {
    await importarBackup(backupV1)
    await db.pasos.add({ fecha: '2026-10-12', pasos: 8432, createdAt: 1, updatedAt: 1 })
    await db.settings.update(1, { zancadaCm: 74 })
    const antes = await exportarBackup()
    expect(antes.pasos).toHaveLength(1)
    await importarBackup(JSON.stringify(antes))
    expect(sinFechaCopia(await exportarBackup())).toEqual(sinFechaCopia(antes))
    expect((await db.settings.get(1))?.zancadaCm).toBe(74)
    await importarBackup(backupV1)
    expect(await db.pasos.count()).toBe(0)
  })
})
