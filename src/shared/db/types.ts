// Tipos de las tablas de Dexie.
// `id: number` NO es opcional a propósito: con Dexie 4, `EntityTable<T, 'id'>` ya permite omitirlo al insertar,
// y declararlo opcional hace que `.add()` pueda devolver `undefined` (ver PROCESO §3).

export type Comida = 'desayuno' | 'comida' | 'cena' | 'snack'

/** `gemini`: alimentos creados con la IA que tuvo la app (ya retirada); solo existe en datos antiguos. */
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

/** Un alimento del catálogo: por ahora solo se conoce como texto libre (`usda`, `off`, `bedca`…). */
export type FuenteCatalogo = string

/** `tipo`: genérico («pollo»), producto de marca o plato preparado. */
export type TipoCatalogo = 'generico' | 'marca' | 'preparado'

/**
 * Alimento del catálogo (tabla `catalogFoods`): solo lectura desde la app, re-descargable y NO va en el backup.
 * `nombreNorm` NO es único (habrá muchas «leche entera»); la identidad es `id`.
 */
export interface CatalogFood {
  /** Determinista y estable: `${fuente}:${idExterno}` (ver `catalogId()`). No es autoincremental. */
  id: string
  fuente: FuenteCatalogo
  idExterno: string
  /** Nombre en español si existe; si no, el original. */
  nombre: string
  nombreOriginal?: string
  nombreNorm: string
  /** Tokens de búsqueda (índice multiEntry): palabras normalizadas del nombre, sin repetir. */
  tok: string[]
  tipo: TipoCatalogo
  categoria?: string
  marca?: string
  /** Código de barras normalizado (solo dígitos). Índice NO único. */
  gtin?: string
  kcal100: number
  prot100: number
  carb100: number
  grasa100: number
  /**
   * Nutrientes adicionales por 100 g, por código (p. ej. `FIBTG`). Clave ausente = desconocido;
   * `0` = conocido y cero. Nunca se rellenan los desconocidos con 0.
   */
  nutrientes?: Record<string, number>
  /** Calidad de los datos, de 0 (casi vacío) a 1 (completo). */
  completitud?: number
  /** Versión del paquete del que viene el registro (para actualizar una fuente y borrar lo antiguo). */
  version: string
  importadoAt: number
  /** Última modificación en la fuente original (ms), si se conoce. */
  actualizadoFuenteAt?: number
}

/** Metadatos de una fuente importada al catálogo (licencia, atribución, versión…). */
export interface CatalogSource {
  id: FuenteCatalogo
  version: string
  importadoAt: number
  licencia: string
  atribucion: string
  filas: number
}

export interface Entry {
  id: number
  fecha: string // YYYY-MM-DD
  comida: Comida
  /** Referencia a un alimento del usuario. Como mucho una de `foodId` / `catalogId` (ver `foodRef.ts`). */
  foodId?: number
  /** Referencia blanda a `catalogFoods.id`. El snapshot de abajo hace que la entrada no dependa del catálogo. */
  catalogId?: string
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
  /** Como en `Entry`: referencia blanda a `catalogFoods.id`. */
  catalogId?: string
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

/** Nota libre sobre una medida que el intérprete no entiende todavía («tarrina de hummus ≈ 200 g»), para añadirla después. */
export interface NotaMedida {
  id: number
  texto: string
  createdAt: number
}

/** Un pesaje: como mucho uno por día (`fecha` es única; registrar de nuevo el mismo día lo sobrescribe). */
export interface Peso {
  id: number
  /** YYYY-MM-DD */
  fecha: string
  kg: number
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
