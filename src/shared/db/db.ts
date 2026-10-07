import Dexie, { type EntityTable } from 'dexie'
import type { Agua, CatalogFood, CatalogSource, Entry, Exercise, Food, Meal, Medida, NombreAlimento, NotaMedida, ObjetivoDia, Peso, Porcion, Receta, Routine, SetEntry, Settings, Workout } from './types'

/**
 * Esquema de IndexedDB. Reglas para cambiarlo sin perder los datos del móvil:
 * - Cada cambio de esquema es un `this.version(n)` nuevo; las versiones anteriores no se tocan.
 *   Las tablas que no se mencionan en una versión nueva se heredan de la anterior.
 * - Añadir una tabla o un campo opcional no necesita `upgrade()`.
 * - Si un `upgrade()` transforma registros, `migrarBackup` (shared/lib/backup.ts) tiene que hacer lo mismo,
 *   porque importar un backup hace `bulkAdd` y se salta los upgrades.
 */
/**
 * Tablas del catálogo: re-descargables, fuera del backup y de «borrar todos los datos».
 * Toda tabla nueva debe ir en una de las dos listas (lo comprueba db.test.ts).
 */
export const TABLAS_CATALOGO = ['catalogFoods', 'catalogSources'] as const

/** Tablas con datos del usuario: van en el backup y se vacían al importar o al borrarlo todo. */
export const TABLAS_USUARIO = [
  'foods', 'entries', 'meals', 'settings', 'exercises', 'routines', 'workouts', 'sets', 'notasMedida', 'pesos', 'nombresAlimentos',
  'porciones', 'recetas', 'agua', 'objetivosDia', 'medidas',
] as const

export class AppFitDB extends Dexie {
  foods!: EntityTable<Food, 'id'>
  entries!: EntityTable<Entry, 'id'>
  settings!: EntityTable<Settings, 'id'>
  exercises!: EntityTable<Exercise, 'id'>
  routines!: EntityTable<Routine, 'id'>
  workouts!: EntityTable<Workout, 'id'>
  sets!: EntityTable<SetEntry, 'id'>
  meals!: EntityTable<Meal, 'id'>
  notasMedida!: EntityTable<NotaMedida, 'id'>
  pesos!: EntityTable<Peso, 'id'>
  nombresAlimentos!: EntityTable<NombreAlimento, 'id'>
  porciones!: EntityTable<Porcion, 'id'>
  recetas!: EntityTable<Receta, 'id'>
  agua!: EntityTable<Agua, 'id'>
  objetivosDia!: EntityTable<ObjetivoDia, 'id'>
  medidas!: EntityTable<Medida, 'id'>
  catalogFoods!: EntityTable<CatalogFood, 'id'>
  catalogSources!: EntityTable<CatalogSource, 'id'>

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
    // v3 (food-database, fase 1): catálogo de alimentos (tablas nuevas y vacías) + índice `entries.catalogId`.
    // Sin upgrade(): Dexie crea las tablas y el índice al abrir y no toca ningún registro existente (los
    // upgrade() solo sirven para transformar datos). `entries` se redeclara entera porque `stores()` sustituye
    // el esquema de la tabla que menciona; el resto se hereda de v1/v2.
    // - `*tok` es multiEntry (una fila por palabra) y admite `startsWith`; sin `grupo` (duplicados: fase futura).
    // - `gtin` y `fuente` NO son únicos; la clave `&id` es el id de catálogo `fuente:idExterno`, no autoincremental.
    this.version(3).stores({
      entries: '++id, fecha, comida, foodId, catalogId, createdAt',
      catalogFoods: '&id, *tok, gtin, fuente',
      catalogSources: '&id',
    })
    // v4 (medidas del intérprete): tabla `notasMedida` (notas sobre medidas que faltan). Tabla nueva y vacía: sin upgrade().
    this.version(4).stores({
      notasMedida: '++id, createdAt',
    })
    // v5 (pantalla Inicio): tabla `pesos` (registro de pesajes). Tabla nueva y vacía: sin upgrade().
    // `&fecha` es único: un pesaje por día (el repositorio sobrescribe el del mismo día).
    this.version(5).stores({
      pesos: '++id, &fecha',
    })
    // v6 (nombres de visualización en Nutrición): preferencias personales por FoodRef. Tabla nueva, sin upgrade().
    this.version(6).stores({
      nombresAlimentos: '&id',
    })
    // v7 (mejoras funcionales): cinco tablas nuevas y vacías, sin upgrade(). Los campos opcionales nuevos de
    // workouts/routines/sets/settings no llevan índice y tampoco necesitan versión.
    // - `porciones`: raciones propias por alimento (`ref` = FoodRef estable).
    // - `recetas`: recetas caseras (cada una mantiene un `Food` propio con los valores por 100 g cocinados).
    // - `agua`: ml bebidos por día (`&fecha`). `objetivosDia`: snapshot del objetivo de cada día (`&fecha`).
    // - `medidas`: medidas corporales por fecha (`&fecha`).
    this.version(7).stores({
      porciones: '++id, ref',
      recetas: '++id, &nombreNorm, foodId',
      agua: '++id, &fecha',
      objetivosDia: '++id, &fecha',
      medidas: '++id, &fecha',
    })
  }
}

export const db = new AppFitDB()
