import Dexie, { type EntityTable } from 'dexie'
import type { Entry, Exercise, Food, Meal, Routine, SetEntry, Settings, Workout } from './types'

/**
 * Esquema de IndexedDB. Reglas para cambiarlo sin perder los datos del móvil:
 * - Cada cambio de esquema es un `this.version(n)` nuevo; las versiones anteriores no se tocan.
 *   Las tablas que no se mencionan en una versión nueva se heredan de la anterior.
 * - Añadir una tabla o un campo opcional no necesita `upgrade()`.
 * - Si un `upgrade()` transforma registros, `migrarBackup` (shared/lib/backup.ts) tiene que hacer lo mismo,
 *   porque importar un backup hace `bulkAdd` y se salta los upgrades.
 */
export class AppFitDB extends Dexie {
  foods!: EntityTable<Food, 'id'>
  entries!: EntityTable<Entry, 'id'>
  settings!: EntityTable<Settings, 'id'>
  exercises!: EntityTable<Exercise, 'id'>
  routines!: EntityTable<Routine, 'id'>
  workouts!: EntityTable<Workout, 'id'>
  sets!: EntityTable<SetEntry, 'id'>
  meals!: EntityTable<Meal, 'id'>

  /** `nombre` solo cambia en los tests (p. ej. para probar migraciones en otra base de datos). */
  constructor(nombre = 'appfit') {
    super(nombre)
    // v1 (sesión 01): esquema inicial.
    this.version(1).stores({
      foods: '++id, &nombreNorm, nombre, fuente, updatedAt',
      entries: '++id, fecha, comida, foodId, createdAt',
      settings: 'id',
      exercises: '++id, &nombreNorm, nombre, grupo',
      routines: '++id, nombre',
      workouts: '++id, inicio, fin, routineId',
      sets: '++id, workoutId, exerciseId, [exerciseId+createdAt], orden, createdAt',
    })
    // v2 (Nutrición v2, fase 1): tabla `meals` (plantillas de comida).
    // Sin upgrade(): es una tabla nueva y vacía, y `entries.rapida` es un campo opcional sin índice.
    this.version(2).stores({
      meals: '++id, usadoAt',
    })
  }
}

export const db = new AppFitDB()
