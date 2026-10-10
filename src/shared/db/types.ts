// Tipos de las tablas de Dexie.
// `id: number` NO es opcional a propósito: con Dexie 4, `EntityTable<T, 'id'>` ya permite omitirlo al insertar,
// y declararlo opcional hace que `.add()` pueda devolver `undefined` (ver PROCESO §3).

export type Comida = 'desayuno' | 'comida' | 'cena' | 'snack'

/** `gemini`: alimentos creados con la IA que tuvo la app (ya retirada); solo existe en datos antiguos. */
export type FuenteAlimento = 'gemini' | 'manual'

/** Gramos: clave ausente = desconocido, cero = valor conocido. */
export type NutrientesAdicionales = Partial<Record<'fibra' | 'azucares' | 'sal' | 'agSat', number>>

export interface Food {
  id: number
  nombreNorm: string
  nombre: string
  kcal100: number
  prot100: number
  carb100: number
  grasa100: number
  nutrientes?: NutrientesAdicionales
  /**
   * Una de las categorías de `nutricion/lib/catalogo/categorias.ts`. Obligatoria al crear desde la app;
   * ausente solo en alimentos anteriores a las categorías (se revisan a mano en Alimentos).
   */
  categoria?: string
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
  /** Sinónimos reales («banana» para «Plátano»). Ya están en `tok`; se guardan para que el ranking cuente el alias exacto. Sin índice. */
  alias?: string[]
  /** Los valores son por 100 ml (bebidas de marca) en lugar de por 100 g. Sin índice. */
  ml?: true
  /** Va detrás de los demás al buscar (alimentos de Martinica/Reunión, infantiles). Sin índice. */
  secundario?: true
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

/** Nombre personal para mostrar un alimento en Nutrición. `id` es la clave estable de un `FoodRef`. */
export interface NombreAlimento {
  id: string
  nombre: string
}

/** Identidad de los ingredientes guardados juntos. Opcional para conservar los registros antiguos. */
export interface AgrupacionPlato {
  platoId?: string
  nombrePlato?: string
}

export interface Entry extends AgrupacionPlato {
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
  /** Snapshot del aporte de la cantidad consumida, no valores por 100 g. */
  nutrientes?: NutrientesAdicionales
  textoOriginal?: string
  createdAt: number
  /** «Kcal rápidas»: entrada sin alimento (gramos = 0, sin foodId), p. ej. una comida fuera. */
  rapida?: true
}

/** Alimento de una plantilla. Guarda un snapshot de respaldo por si el alimento se borra (o si es una entrada rápida). */
export interface MealItem extends AgrupacionPlato {
  foodId?: number
  /** Como en `Entry`: referencia blanda a `catalogFoods.id`. */
  catalogId?: string
  nombre: string
  gramos: number
  kcal: number
  prot: number
  carb: number
  grasa: number
  nutrientes?: NutrientesAdicionales
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

/** Ración propia de un alimento («rebanada» de pan bimbo = 30 g). `ref` es un FoodRef estable (`user:<id>` | `catalog:<id>`). */
export interface Porcion {
  id: number
  ref: string
  nombre: string
  nombreNorm: string
  gramos: number
}

/**
 * Receta casera. Guarda un snapshot de los ingredientes y el peso cocinado; `foodId` es el `Food` propio que
 * la representa (valores por 100 g del peso cocinado), así funciona en búsqueda, frecuentes e intérprete.
 */
export interface Receta {
  id: number
  nombre: string
  nombreNorm: string
  ingredientes: MealItem[]
  pesoCocinadoG: number
  foodId: number
  createdAt: number
  updatedAt: number
}

/** Agua bebida en un día (`fecha` única). */
export interface Agua {
  id: number
  fecha: string
  /** Total del día; si hay `tomas`, es su suma. */
  ml: number
  /** Cada toma, en orden, para poder quitar la última. Ausente en datos importados sin detalle. */
  tomas?: number[]
}

/** Snapshot del objetivo de un día. `origen` indica qué acción lo escribió. */
export interface ObjetivoDia {
  id: number
  fecha: string
  objetivos: Objetivos
  origen: string
}

/** Medidas corporales de un día (cm y %). Todo opcional salvo la fecha. */
export interface Medida {
  id: number
  fecha: string
  cintura?: number
  cadera?: number
  pecho?: number
  brazo?: number
  muslo?: number
  grasaPct?: number
}

export interface Objetivos {
  kcal: number
  prot: number
  carb: number
  grasa: number
}

export type SexoPerfil = 'hombre' | 'mujer'
export type ActividadPerfil = 'sedentario' | 'ligero' | 'moderado' | 'activo' | 'muy-activo'
export type ObjetivoPerfil = 'definicion' | 'mantenimiento' | 'volumen'
export type IntensidadKcal = 200 | 300 | 400 | 500 | 600

/**
 * Datos fuente del perfil energético (dentro de `Settings`). Todo opcional para poder guardar por partes.
 * Peso (último pesaje), edad, TMB, GET y kcal objetivo NO se guardan: se derivan al leer.
 */
export interface Perfil {
  /** Las ecuaciones son binarias; el campo es el «sexo para la ecuación». */
  sexo?: SexoPerfil
  /** YYYY-MM-DD */
  fechaNacimiento?: string
  alturaCm?: number
  actividad?: ActividadPerfil
  objetivo?: ObjetivoPerfil
  /** Magnitud en kcal/día; el signo lo da el objetivo y se ignora en mantenimiento. */
  intensidadKcal?: IntensidadKcal
  /** Proteína por kg de peso: activa por defecto; `false` la desactiva explícitamente. */
  proteinaPorKgActiva?: boolean
  proteinaPorKg?: number
  /** Usar el gasto observado (adaptativo) en lugar del estimado. */
  usarGastoObservado?: boolean
}

export interface Settings {
  id: number // siempre 1 (registro único)
  objetivos: Objetivos
  /** Ausente en datos y backups anteriores a la sección Perfil. */
  perfil?: Perfil
  /** ms de la última exportación de copia lanzada desde Ajustes. */
  ultimaExportacion?: number
  /** ms hasta el que se pospone el recordatorio de copia. */
  recordatorioBackupPospuesto?: number
  /** Días sin copia a partir de los cuales se recuerda (por defecto 14). */
  recordatorioBackupDias?: number
  /** Peso de la barra para la calculadora de discos (kg, por defecto 20). */
  barraKg?: number
  /** Sonido al terminar el descanso (por defecto sí). */
  sonidoDescanso?: boolean
  /** Abrir el selector de RIR al completar una serie (por defecto sí). */
  rirAlCompletar?: boolean
  /** Objetivo opcional de agua diaria (ml). */
  aguaObjetivoMl?: number
  /** Lunes (YYYY-MM-DD) de la última semana cuya revisión se cerró en Inicio. */
  revisionSemanalCerrada?: string
  /** Plan semanal por tramos (`ritmo/lib/plan.ts`). Ausente = plan por defecto. */
  planSemanal?: TramoPlanSemanal[]
  /** Atributos, Ritmo y Vitrina en Inicio, Más y al terminar un entreno (por defecto sí). */
  gamificacionVisible?: boolean
  /** La nutrición cuenta en Atributos, Ritmo y Vitrina: registro de comidas, proteína y plantas (por defecto sí). */
  gamificacionConNutricion?: boolean
  /** Pausas declaradas de Ritmo (vacaciones, enfermedad, lesión…), ordenadas por `desde`. */
  pausas?: Pausa[]
  /** Ejercicios (`Exercise.id`) que el usuario mantiene en Élite de la Liga: no avisan durante el entreno. */
  ligaMantener?: number[]
}

export type TipoPausa = 'total' | 'entreno'
export type MotivoPausa = 'vacaciones' | 'enfermedad' | 'lesion' | 'viaje' | 'otro'

/** Pausa de Ritmo: congela el hilo. `total` o solo de entreno (la semana se juzga con la nutrición). */
export interface Pausa {
  /** Identificador estable para borrar o terminar una pausa concreta. */
  id: string
  /** YYYY-MM-DD, ambos incluidos. Sin `hasta`, la pausa sigue en curso. */
  desde: string
  hasta?: string
  tipo: TipoPausa
  motivo: MotivoPausa
}

/** Lo que hace «cumplida» una semana: entrenos y días con comidas registradas. */
export interface PlanSemanal {
  entrenos: number
  diasRegistro: number
}

/** Plan que rige desde el lunes `desde` (YYYY-MM-DD). Las semanas anteriores al primer tramo usan el primero. */
export interface TramoPlanSemanal extends PlanSemanal {
  desde: string
}

export interface Exercise {
  id: number
  nombreNorm: string
  nombre: string
  grupo: string
  /** Vínculo opcional al catálogo incluido en la app; el id numérico sigue siendo la identidad histórica. */
  catalogId?: string
  /** Ausentes en registros antiguos; nunca se infieren ni escriben al leer. */
  primaryMuscles?: string[]
  secondaryMuscles?: string[]
  equipment?: string[]
  ejecucionHabitual?: ConfiguracionEjecucion
  progresion?: PlanProgresion
}

export interface Routine {
  id: number
  nombre: string
  exerciseIds: number[]
  /** Objetivos por ejercicio (clave = exerciseId). */
  objetivos?: Record<number, ObjetivoEjercicio>
}

export interface ObjetivoEjercicio {
  series: number
  repsMin: number
  repsMax: number
  descansoSeg?: number
}

export interface Workout {
  id: number
  inicio: number
  fin?: number
  routineId?: number
  notas?: string
  /** Notas del ejercicio en esta sesión, independientes de las notas generales. */
  notasEjercicios?: Record<number, string>
  /** Modo usado al crear nuevas series; cada serie conserva su propio snapshot. */
  cargasEjercicios?: Record<number, ConfiguracionCarga>
  ejecucionesEjercicios?: Record<number, ConfiguracionEjecucion>
  decisionesProgresion?: Record<number, { clave: string; decision: 'aplicada' | 'mantener' | 'descartada' }>
  /** Orden manual de los ejercicios de la sesión; manda sobre el derivado de las series si existe. */
  ordenEjercicios?: number[]
  /** Ejercicios quitados solo de esta sesión: no modifica la rutina original. */
  ejerciciosOmitidos?: number[]
  /** Clasificación semántica al finalizar. Las series siguen en sets; nunca guardar colores/niveles. */
  muscleSnapshot?: WorkoutMuscleSnapshot
}

export interface WorkoutExerciseMuscles {
  exerciseId: number
  nombre: string
  catalogId?: string
  primaryMuscles: string[]
  secondaryMuscles: string[]
}
export interface WorkoutMuscleSnapshot {
  version: 1
  exercises: WorkoutExerciseMuscles[]
}

export interface SetEntry {
  id: number
  workoutId: number
  exerciseId: number
  orden: number
  reps: number
  peso: number
  createdAt: number
  /** Ausente = serie efectiva. */
  tipo?: 'calentamiento'
  /** Repeticiones en reserva (0–5), opcional. */
  rir?: number
  /** Ausente = kg externos históricos. `peso` es lastre/asistencia en esos modos. */
  modoCarga?: ModoCarga
  /** Masa corporal utilizada en esta sesión, nunca derivada de un pesaje posterior. */
  pesoCorporal?: number
  /** Ausente = ejecución histórica bilateral, agarre y tempo no especificados. */
  ejecucion?: Ejecucion
  kgUnilateral?: 'lado' | 'total'
  agarre?: Agarre
  lados?: Partial<Record<Lado, DatosLado>>
  /** Descenso de una repetición completa, o solo fase excéntrica. */
  soloNegativas?: boolean
  excentricaSeg?: number
  /** Tramos de la misma serie extendida; no son series independientes. */
  bajadas?: TramoDropset[]
  /** Ausente = realización desconocida en histórico. Nunca inferir de reps precargadas. */
  realizada?: boolean
}

export type Ejecucion = 'bilateral' | 'unilateral' | 'lados'
export type Lado = 'izquierda' | 'derecha'
export interface DatosLado { reps: number; peso: number; rir?: number }
export interface TramoDropset { id: string; reps: number; peso: number; lados?: Partial<Record<Lado, DatosLado>> }
export interface Agarre { orientacion?: 'prono' | 'supino' | 'neutro'; anchura?: 'estrecho' | 'medio' | 'ancho'; accesorio?: 'barra' | 'cuerda' | 'individual' | 'maquina' }
export interface ConfiguracionEjecucion { ejecucion: Ejecucion; kgUnilateral?: 'lado' | 'total'; agarre?: Agarre }
export interface PlanProgresion { series: number; repsMin: number; repsMax: number; incrementoKg?: number; rirMin?: number }

export type ModoCarga = 'externa' | 'corporal' | 'lastre' | 'asistencia'
export interface ConfiguracionCarga { modo: ModoCarga; pesoCorporal?: number }
