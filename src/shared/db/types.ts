// Tipos de las tablas de Dexie.
// `id: number` NO es opcional a propósito: con Dexie 4, `EntityTable<T, 'id'>` ya permite omitirlo al insertar,
// y declararlo opcional hace que `.add()` pueda devolver `undefined` (ver PROCESO §3).

export type Comida = 'desayuno' | 'comida' | 'cena' | 'snack'

export type FuenteAlimento = 'gemini' | 'manual'

export interface Food {
  id: number
  nombreNorm: string
  nombre: string
  kcal100: number
  prot100: number
  carb100: number
  grasa100: number
  fuente: FuenteAlimento
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
  /** «Kcal rápidas»: entrada sin alimento (gramos = 0, sin foodId), p. ej. una comida fuera. */
  rapida?: true
}

/** Alimento de una plantilla. Guarda un snapshot de respaldo por si el alimento se borra (o si es una entrada rápida). */
export interface MealItem {
  foodId?: number
  nombre: string
  gramos: number
  kcal: number
  prot: number
  carb: number
  grasa: number
  rapida?: true
}

/** Plantilla de comida («mi desayuno de siempre»). Las recetas (A7) añadirán más adelante un peso cocinado opcional. */
export interface Meal {
  id: number
  nombre: string
  comida?: Comida
  items: MealItem[]
  usos: number
  usadoAt: number
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
