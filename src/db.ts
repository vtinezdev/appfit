import Dexie, { type EntityTable } from 'dexie'

export type Comida = 'desayuno' | 'comida' | 'cena' | 'snack'

export interface Food {
  id: number
  nombreNorm: string
  nombre: string
  kcal100: number
  prot100: number
  carb100: number
  grasa100: number
  fuente: 'gemini' | 'manual'
  updatedAt: number
}

export interface Entry {
  id: number
  fecha: string // YYYY-MM-DD
  comida: Comida
  foodId?: number
  nombre: string
  gramos: number
  kcal: number
  prot: number
  carb: number
  grasa: number
  textoOriginal?: string
  createdAt: number
}

export interface Objetivos {
  kcal: number
  prot: number
  carb: number
  grasa: number
}

export interface Settings {
  id: number // siempre 1 (registro único)
  apiKey: string
  modelo: string
  objetivos: Objetivos
}

export interface Exercise {
  id: number
  nombreNorm: string
  nombre: string
  grupo: string
}

export interface Routine {
  id: number
  nombre: string
  exerciseIds: number[]
}

export interface Workout {
  id: number
  inicio: number
  fin?: number
  routineId?: number
  notas?: string
}

export interface SetEntry {
  id: number
  workoutId: number
  exerciseId: number
  orden: number
  reps: number
  peso: number
  createdAt: number
}

export const DEFAULT_OBJETIVOS: Objetivos = { kcal: 2200, prot: 150, carb: 220, grasa: 70 }
export const DEFAULT_MODELO = 'gemini-3.8-flash'

class AppFitDB extends Dexie {
  foods!: EntityTable<Food, 'id'>
  entries!: EntityTable<Entry, 'id'>
  settings!: EntityTable<Settings, 'id'>
  exercises!: EntityTable<Exercise, 'id'>
  routines!: EntityTable<Routine, 'id'>
  workouts!: EntityTable<Workout, 'id'>
  sets!: EntityTable<SetEntry, 'id'>

  constructor() {
    super('appfit')
    this.version(1).stores({
      foods: '++id, &nombreNorm, nombre, fuente, updatedAt',
      entries: '++id, fecha, comida, foodId, createdAt',
      settings: 'id',
      exercises: '++id, &nombreNorm, nombre, grupo',
      routines: '++id, nombre',
      workouts: '++id, inicio, fin, routineId',
      sets: '++id, workoutId, exerciseId, [exerciseId+createdAt], orden, createdAt',
    })
  }
}

export const db = new AppFitDB()

export function normalizeName(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/** Solo lectura: segura de usar dentro de un liveQuery. No escribe en la BD. */
export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get(1)
  if (s) return s
  return { id: 1, apiKey: '', modelo: DEFAULT_MODELO, objetivos: DEFAULT_OBJETIVOS }
}

/** Crea el registro de settings por defecto si todavía no existe. Llamar una vez al arrancar la app. */
export async function ensureSettings(): Promise<void> {
  const s = await db.settings.get(1)
  if (!s) {
    await db.settings.put({ id: 1, apiKey: '', modelo: DEFAULT_MODELO, objetivos: DEFAULT_OBJETIVOS })
  }
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<Settings> {
  const current = await getSettings()
  const next: Settings = { ...current, ...patch, id: 1 }
  await db.settings.put(next)
  return next
}
