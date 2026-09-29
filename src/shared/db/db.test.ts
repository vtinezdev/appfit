import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import backupV1 from '../../test/fixtures/backup-v1.json?raw'
import { AppFitDB } from './db'

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

describe('migraciones de Dexie', () => {
  it('v1 → v2: los datos existentes sobreviven y aparece la tabla meals vacía', async () => {
    const nombre = 'appfit-migracion-test'
    const datos = JSON.parse(backupV1)

    const v1 = new Dexie(nombre)
    v1.version(1).stores(ESQUEMA_V1)
    await v1.open()
    for (const tabla of Object.keys(ESQUEMA_V1)) await v1.table(tabla).bulkAdd(datos[tabla])
    v1.close()

    const actual = new AppFitDB(nombre)
    await actual.open()
    expect(actual.verno).toBe(2)
    for (const tabla of Object.keys(ESQUEMA_V1)) {
      expect(await actual.table(tabla).count(), tabla).toBe(datos[tabla].length)
    }
    expect(await actual.entries.get(9)).toEqual(datos.entries[8])
    expect(await actual.meals.count()).toBe(0)
    // Los índices de v1 siguen funcionando.
    expect((await actual.foods.where('nombreNorm').equals('platano').first())?.id).toBe(1)
    actual.close()
    await Dexie.delete(nombre)
  })
})
