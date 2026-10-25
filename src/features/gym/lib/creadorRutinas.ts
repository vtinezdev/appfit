// Creador de rutinas por reglas, sin IA ni red: las respuestas eligen un reparto, cada día pide patrones de movimiento
// y los huecos se rellenan con ejercicios del catálogo que encajan con el material. Funciones puras y deterministas: la
// misma semilla da el mismo plan. Nada se guarda hasta que el usuario lo decide (`routinesRepo.guardarPlan`).
import type { ObjetivoEjercicio } from '../../../shared/db/types'
import { normalizeName } from '../../../shared/lib/text'
import {
  CATALOGO_EJERCICIOS, CATALOGO_POR_ID, PATRONES_COMPUESTOS, ordenEnPatron,
  type CatalogExercise, type Equipo, type Musculo, type Patron, type TipoEjercicio,
} from './catalogoEjercicios'
import type { SeleccionEjercicio } from './selectorEjercicios'

export const DIAS_CREADOR = [2, 3, 4, 5, 6] as const
export type DiasCreador = (typeof DIAS_CREADOR)[number]
export const DURACIONES = [45, 60, 75] as const
export type Duracion = (typeof DURACIONES)[number]
export type Material = 'gimnasio' | 'mancuernas' | 'casa'
export type ObjetivoCreador = 'hipertrofia' | 'fuerza' | 'general'

export interface RespuestasCreador {
  dias: DiasCreador
  duracion: Duracion
  material: Material
  objetivo: ObjetivoCreador
  /** Músculos a priorizar (opcional): un ejercicio más para ellos en los días que los trabajan. */
  prioridad: Musculo[]
}

/** `equipos` null: todo el material. Un ejercicio encaja si todo su material está disponible. */
export const MATERIALES: Record<Material, { label: string; descripcion: string; equipos: ReadonlySet<Equipo> | null }> = {
  gimnasio: { label: 'Gimnasio completo', descripcion: 'Máquinas, poleas, barras y mancuernas.', equipos: null },
  mancuernas: { label: 'Mancuernas y banco', descripcion: 'Mancuernas y ejercicios con tu peso.', equipos: new Set<Equipo>(['mancuernas', 'corporal']) },
  casa: { label: 'Casa', descripcion: 'Peso corporal y bandas elásticas.', equipos: new Set<Equipo>(['corporal', 'bandas']) },
}

export const OBJETIVOS_CREADOR: Record<ObjetivoCreador, string> = { hipertrofia: 'Hipertrofia', fuerza: 'Fuerza', general: 'General' }

/** Series, repeticiones y descanso según el objetivo y el tipo de ejercicio. */
export const OBJETIVOS_POR_TIPO: Record<ObjetivoCreador, Record<TipoEjercicio, ObjetivoEjercicio>> = {
  hipertrofia: { compuesto: { series: 3, repsMin: 6, repsMax: 10, descansoSeg: 120 }, aislamiento: { series: 3, repsMin: 10, repsMax: 15, descansoSeg: 90 } },
  fuerza: { compuesto: { series: 4, repsMin: 3, repsMax: 6, descansoSeg: 180 }, aislamiento: { series: 3, repsMin: 8, repsMax: 12, descansoSeg: 90 } },
  general: { compuesto: { series: 3, repsMin: 8, repsMax: 12, descansoSeg: 90 }, aislamiento: { series: 2, repsMin: 12, repsMax: 15, descansoSeg: 60 } },
}

/** Ejercicios por sesión según el tiempo; con Fuerza, uno menos (más series y descansos más largos). */
export function ejerciciosPorSesion(duracion: Duracion, objetivo: ObjetivoCreador): number {
  return { 45: 5, 60: 6, 75: 7 }[duracion] - (objetivo === 'fuerza' ? 1 : 0)
}

export type Enfoque = 'completo' | 'torso' | 'pierna' | 'empuje' | 'tiron'
interface PlantillaDia { nombre: string; enfoque: Enfoque; huecos: Patron[] }

// Siete huecos por día, del más importante al menos: la sesión usa los primeros según el tiempo.
const D = (nombre: string, enfoque: Enfoque, huecos: Patron[]): PlantillaDia => ({ nombre, enfoque, huecos })
const COMPLETO_A = D('Cuerpo completo A', 'completo', ['sentadilla', 'empuje-horizontal', 'tiron-vertical', 'bisagra', 'hombro-lateral', 'biceps', 'core'])
const COMPLETO_B = D('Cuerpo completo B', 'completo', ['bisagra', 'empuje-vertical', 'tiron-horizontal', 'unilateral', 'pecho-aislamiento', 'triceps', 'gemelos'])
const COMPLETO_C = D('Cuerpo completo C', 'completo', ['unilateral', 'empuje-horizontal', 'tiron-horizontal', 'gluteo', 'hombro-posterior', 'femoral', 'core'])
const TORSO = ['empuje-horizontal', 'tiron-horizontal', 'empuje-vertical', 'tiron-vertical', 'hombro-lateral', 'biceps', 'triceps'] satisfies Patron[]
const TORSO_B = ['tiron-vertical', 'empuje-horizontal', 'tiron-horizontal', 'empuje-vertical', 'pecho-aislamiento', 'triceps', 'biceps'] satisfies Patron[]
const PIERNA = ['sentadilla', 'bisagra', 'unilateral', 'cuadriceps-aislamiento', 'femoral', 'gemelos', 'core'] satisfies Patron[]
const PIERNA_B = ['bisagra', 'sentadilla', 'gluteo', 'femoral', 'unilateral', 'gemelos', 'core'] satisfies Patron[]
const EMPUJE = ['empuje-horizontal', 'empuje-vertical', 'empuje-horizontal', 'hombro-lateral', 'triceps', 'pecho-aislamiento', 'triceps'] satisfies Patron[]
const EMPUJE_B = ['empuje-vertical', 'empuje-horizontal', 'pecho-aislamiento', 'hombro-lateral', 'triceps', 'empuje-horizontal', 'hombro-lateral'] satisfies Patron[]
const TIRON = ['tiron-vertical', 'tiron-horizontal', 'tiron-horizontal', 'hombro-posterior', 'biceps', 'biceps', 'trapecio'] satisfies Patron[]
const TIRON_B = ['tiron-horizontal', 'tiron-vertical', 'tiron-vertical', 'hombro-posterior', 'biceps', 'antebrazo', 'core'] satisfies Patron[]

/** Reparto según los días por semana: una rutina por día distinto. */
export const REPARTOS: Record<DiasCreador, { nombre: string; dias: PlantillaDia[] }> = {
  2: { nombre: 'Cuerpo completo', dias: [COMPLETO_A, COMPLETO_B] },
  3: { nombre: 'Cuerpo completo', dias: [COMPLETO_A, COMPLETO_B, COMPLETO_C] },
  4: { nombre: 'Torso / pierna', dias: [D('Torso A', 'torso', TORSO), D('Pierna A', 'pierna', PIERNA), D('Torso B', 'torso', TORSO_B), D('Pierna B', 'pierna', PIERNA_B)] },
  5: { nombre: 'Torso / pierna + empuje / tirón / pierna', dias: [D('Torso', 'torso', TORSO), D('Pierna', 'pierna', PIERNA), D('Empuje', 'empuje', EMPUJE),
    D('Tirón', 'tiron', TIRON), D('Pierna B', 'pierna', PIERNA_B)] },
  6: { nombre: 'Empuje / tirón / pierna', dias: [D('Empuje A', 'empuje', EMPUJE), D('Tirón A', 'tiron', TIRON), D('Pierna A', 'pierna', PIERNA),
    D('Empuje B', 'empuje', EMPUJE_B), D('Tirón B', 'tiron', TIRON_B), D('Pierna B', 'pierna', PIERNA_B)] },
}

/** Si un patrón no tiene ejercicios con ese material (o ya están todos en el día), se prueba con estos, en orden. */
export const SUSTITUTOS: Record<Patron, Patron[]> = {
  'empuje-horizontal': ['empuje-vertical'], 'empuje-vertical': ['hombro-lateral', 'empuje-horizontal'], 'tiron-horizontal': ['tiron-vertical'],
  'tiron-vertical': ['tiron-horizontal'], sentadilla: ['unilateral'], bisagra: ['gluteo', 'femoral'], unilateral: ['sentadilla'],
  'pecho-aislamiento': ['empuje-horizontal'], 'hombro-lateral': ['empuje-vertical'], 'hombro-frontal': ['hombro-lateral'],
  'hombro-posterior': ['tiron-horizontal'], biceps: ['tiron-horizontal', 'tiron-vertical', 'antebrazo'], triceps: ['empuje-horizontal'],
  'cuadriceps-aislamiento': ['unilateral', 'sentadilla'], femoral: ['bisagra'], gluteo: ['bisagra', 'unilateral'], aductores: ['unilateral'],
  gemelos: ['core'], core: [], antebrazo: ['biceps', 'core'], trapecio: ['hombro-posterior', 'tiron-horizontal'], completo: [],
}

/** El ejercicio de más que pide priorizar un músculo, y los días que lo trabajan. */
const PATRON_PRIORIDAD: Partial<Record<Musculo, Patron>> = {
  pecho: 'pecho-aislamiento', espalda: 'tiron-horizontal', hombros: 'hombro-lateral', biceps: 'biceps', triceps: 'triceps', antebrazo: 'antebrazo',
  cuadriceps: 'cuadriceps-aislamiento', isquiotibiales: 'femoral', gluteos: 'gluteo', aductores: 'aductores', gemelos: 'gemelos', core: 'core',
}
const MUSCULOS_ENFOQUE: Record<Enfoque, readonly Musculo[]> = {
  completo: Object.keys(PATRON_PRIORIDAD) as Musculo[],
  torso: ['pecho', 'espalda', 'hombros', 'biceps', 'triceps', 'antebrazo'],
  pierna: ['cuadriceps', 'isquiotibiales', 'gluteos', 'aductores', 'gemelos', 'core'],
  empuje: ['pecho', 'hombros', 'triceps'],
  tiron: ['espalda', 'biceps', 'antebrazo'],
}
/** Los músculos que se pueden priorizar (todos menos Cuerpo completo, que no es una zona). */
export const MUSCULOS_PRIORIZABLES = Object.keys(PATRON_PRIORIDAD) as Musculo[]
/** Como mucho, dos ejercicios de prioridad por día: el resto de la sesión sigue siendo del reparto. */
const PRIORIDAD_POR_DIA = 2

export function encajaMaterial(e: Pick<CatalogExercise, 'equipment'>, material: Material): boolean {
  const equipos = MATERIALES[material].equipos
  return equipos === null || e.equipment.every((q) => equipos.has(q))
}

/** Días por defecto: los entrenos por semana de Ritmo, dentro de 2–6. */
export function diasPorDefecto(entrenosPlan: number): DiasCreador {
  return Math.min(6, Math.max(2, Math.round(entrenosPlan))) as DiasCreador
}

/** Los tres primeros huecos (los compuestos principales) nunca se sustituyen por un músculo a priorizar. */
const HUECOS_FIJOS = 3

/**
 * Huecos del día: los primeros según el tiempo. Cada músculo a priorizar que trabaja ese día (hasta dos) ocupa el
 * aislamiento menos importante que no sea ya de un músculo priorizado; en una sesión solo de compuestos, el último de
 * ellos. La sesión no se alarga.
 */
export function huecosDelDia(plantilla: PlantillaDia, r: RespuestasCreador): Patron[] {
  const huecos = plantilla.huecos.slice(0, ejerciciosPorSesion(r.duracion, r.objetivo))
  const prioritarios = r.prioridad.filter((m) => MUSCULOS_ENFOQUE[plantilla.enfoque].includes(m)).flatMap((m) => PATRON_PRIORIDAD[m] ?? [])
  const protegidos = new Set(prioritarios)
  const libre = (compuesto: boolean) => {
    for (let i = huecos.length - 1; i >= HUECOS_FIJOS; i--) if (!protegidos.has(huecos[i]) && PATRONES_COMPUESTOS.has(huecos[i]) === compuesto) return i
    return -1
  }
  for (const patron of prioritarios.slice(0, PRIORIDAD_POR_DIA)) {
    const i = libre(false) >= 0 ? libre(false) : huecos.every((h) => PATRONES_COMPUESTOS.has(h)) ? libre(true) : -1
    if (i < 0) break
    huecos[i] = patron
    protegidos.add(patron)
  }
  return huecos
}

export interface EjercicioPlan {
  seleccion: SeleccionEjercicio
  /** Del catálogo; ausente si se eligió un ejercicio propio sin vínculo. */
  catalogId?: string
  nombre: string
  /** El hueco que ocupa (para «Otra sugerencia» y «Cambiar»), aunque el ejercicio elegido a mano sea de otro patrón. */
  patron: Patron
  tipo: TipoEjercicio
  objetivo: ObjetivoEjercicio
}
export interface DiaPlan { nombre: string; enfoque: Enfoque; ejercicios: EjercicioPlan[] }
export interface PlanCreador { reparto: string; dias: DiaPlan[] }

export interface ContextoCreador {
  /** Ids del catálogo que se pueden elegir (los que no chocan con un ejercicio propio); sin él, todos. */
  disponibles?: ReadonlySet<string>
  /** Nombre visible de cada id del catálogo (el del ejercicio guardado, si lo hay). */
  nombres?: ReadonlyMap<string, string>
}

/** Generador pseudoaleatorio pequeño y determinista (mulberry32). */
function aleatorio(semilla: number): () => number {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function delPatron(patron: Patron, material: Material, ctx: ContextoCreador): CatalogExercise[] {
  return CATALOGO_EJERCICIOS.filter((e) => e.patron === patron && encajaMaterial(e, material) && (!ctx.disponibles || ctx.disponibles.has(e.id)))
    .sort((a, b) => ordenEnPatron(a.id) - ordenEnPatron(b.id))
}

const tipoEsperado = (p: Patron): TipoEjercicio => (PATRONES_COMPUESTOS.has(p) ? 'compuesto' : 'aislamiento')

function aPlan(e: CatalogExercise, patron: Patron, objetivo: ObjetivoCreador, ctx: ContextoCreador): EjercicioPlan {
  return { seleccion: { tipo: 'catalogo', catalogId: e.id }, catalogId: e.id, nombre: ctx.nombres?.get(e.id) ?? e.name, patron, tipo: e.tipo, objetivo: { ...OBJETIVOS_POR_TIPO[objetivo][e.tipo] } }
}

/**
 * Ejercicio para un hueco: el patrón o, si no hay (o ya están todos en el día), sus sustitutos. Entre los candidatos (sin repetir el día) se prefieren
 * los no usados en otros días, los del tipo del patrón y los de un músculo a priorizar; de esos, uno de los tres más
 * básicos (el primero con la semilla 0).
 */
/**
 * El patrón y sus sustitutos, y los de estos, en orden de cercanía y sin repetir. Como último recurso, core: con poco
 * material (un día de tirón en casa) es lo único que siempre queda.
 */
function patronesPara(hueco: Patron): Patron[] {
  const orden: Patron[] = [hueco]
  for (let i = 0; i < orden.length; i++) for (const s of SUSTITUTOS[orden[i]]) if (!orden.includes(s)) orden.push(s)
  return orden.includes('core') ? orden : [...orden, 'core']
}

function elegir(hueco: Patron, enDia: ReadonlySet<string>, enOtros: ReadonlySet<string>, r: RespuestasCreador, azar: (() => number) | null, ctx: ContextoCreador) {
  const prioridad = new Set(r.prioridad)
  for (const patron of patronesPara(hueco)) {
    const candidatos = delPatron(patron, r.material, ctx).filter((e) => !enDia.has(e.id))
    if (!candidatos.length) continue
    const clave = (e: CatalogExercise) => [enOtros.has(e.id) ? 1 : 0, e.tipo === tipoEsperado(patron) ? 0 : 1, e.primaryMuscles.some((m) => prioridad.has(m)) ? 0 : 1]
    const mejor = candidatos.map((e) => ({ e, k: clave(e) })).sort((a, b) => a.k[0] - b.k[0] || a.k[1] - b.k[1] || a.k[2] - b.k[2])
    const nivel = mejor.filter((c) => c.k.join() === mejor[0].k.join()).slice(0, 3)
    return nivel[azar ? Math.floor(azar() * nivel.length) : 0].e
  }
  return null
}

/** Compuestos primero; dentro de cada tipo, el orden de los huecos. */
function ordenarSesion(ejercicios: EjercicioPlan[]): EjercicioPlan[] {
  return ejercicios.map((e, i) => ({ e, i })).sort((a, b) => Number(a.e.tipo === 'aislamiento') - Number(b.e.tipo === 'aislamiento') || a.i - b.i).map(({ e }) => e)
}

/** El plan completo: una rutina por día del reparto. La semilla 0 da los ejercicios más básicos; otra, variantes. */
export function generarPlan(r: RespuestasCreador, semilla = 0, ctx: ContextoCreador = {}): PlanCreador {
  const azar = semilla === 0 ? null : aleatorio(semilla)
  const usados = new Set<string>()
  const reparto = REPARTOS[r.dias]
  const dias = reparto.dias.map((plantilla) => {
    const enDia = new Set<string>()
    const ejercicios: EjercicioPlan[] = []
    for (const hueco of huecosDelDia(plantilla, r)) {
      const e = elegir(hueco, enDia, usados, r, azar, ctx)
      if (!e) continue
      enDia.add(e.id)
      ejercicios.push(aPlan(e, hueco, r.objetivo, ctx))
    }
    for (const id of enDia) usados.add(id)
    return { nombre: plantilla.nombre, enfoque: plantilla.enfoque, ejercicios: ordenarSesion(ejercicios) }
  })
  return { reparto: reparto.nombre, dias: conGemelos(dias, r, usados, azar, ctx) }
}

/** Series del ejercicio de gemelos que se añade cuando el reparto no deja sitio para ninguno. */
export const SERIES_GEMELOS = 3
const trabajaGemelos = (e: EjercicioPlan) => !!e.catalogId && !!CATALOGO_POR_ID.get(e.catalogId)?.primaryMuscles.includes('gemelos')

/**
 * Con poco tiempo o pocos días el hueco de gemelos se queda fuera y ese grupo no progresa nunca (ENT-16). Si ningún día
 * los trae, se añade un ejercicio de gemelos con `SERIES_GEMELOS` series al día de pierna (o de cuerpo completo) con
 * menos series: alarga un poco esa sesión, que es lo que eligió Víctor. Sin ejercicio de gemelos con ese material, nada.
 */
function conGemelos(dias: PlanCreador['dias'], r: RespuestasCreador, usados: ReadonlySet<string>, azar: (() => number) | null, ctx: ContextoCreador): PlanCreador['dias'] {
  if (dias.some((d) => d.ejercicios.some(trabajaGemelos))) return dias
  const series = (d: PlanCreador['dias'][number]) => d.ejercicios.reduce((n, e) => n + e.objetivo.series, 0)
  const candidatos = dias.map((d, i) => ({ d, i })).filter(({ d }) => d.enfoque === 'pierna' || d.enfoque === 'completo')
  const destino = candidatos.sort((a, b) => series(a.d) - series(b.d) || a.i - b.i)[0]
  if (!destino) return dias
  const enDia = new Set(destino.d.ejercicios.flatMap((e) => (e.catalogId ? [e.catalogId] : [])))
  const e = elegir('gemelos', enDia, usados, r, azar, ctx)
  if (!e || !e.primaryMuscles.includes('gemelos')) return dias
  const plan = aPlan(e, 'gemelos', r.objetivo, ctx)
  const nuevo = { ...plan, objetivo: { ...plan.objetivo, series: SERIES_GEMELOS } }
  return dias.map((d, i) => (i === destino.i ? { ...d, ejercicios: ordenarSesion([...d.ejercicios, nuevo]) } : d))
}

function conEjercicio(plan: PlanCreador, dia: number, indice: number, nuevo: EjercicioPlan): PlanCreador {
  return { ...plan, dias: plan.dias.map((d, i) => (i !== dia ? d : { ...d, ejercicios: d.ejercicios.map((e, j) => (j === indice ? nuevo : e)) })) }
}

/**
 * Siguiente ejercicio del mismo patrón y material (en orden de más a menos básico, y vuelta a empezar) que no esté ya en
 * el día. Sin otro posible, el plan no cambia.
 */
export function otraSugerencia(plan: PlanCreador, dia: number, indice: number, r: RespuestasCreador, ctx: ContextoCreador = {}): PlanCreador {
  const actual = plan.dias[dia]?.ejercicios[indice]
  if (!actual) return plan
  const enDia = new Set(plan.dias[dia].ejercicios.flatMap((e, j) => (j !== indice && e.catalogId ? [e.catalogId] : [])))
  const candidatos = delPatron(actual.patron, r.material, ctx).filter((e) => !enDia.has(e.id) && e.id !== actual.catalogId)
  if (!candidatos.length) return plan
  const posicion = actual.catalogId ? ordenEnPatron(actual.catalogId) : -1
  const siguiente = candidatos.find((e) => ordenEnPatron(e.id) > posicion) ?? candidatos[0]
  return conEjercicio(plan, dia, indice, aPlan(siguiente, actual.patron, r.objetivo, ctx))
}

/**
 * Sugerencias para «Cambiar»: el mismo patrón y material, sin los ejercicios del día; primero los que ya has hecho
 * (`hechos`, ids del catálogo) y después de más a menos básico.
 */
export function sugerenciasCambio(plan: PlanCreador, dia: number, indice: number, material: Material, hechos: ReadonlySet<string>, ctx: ContextoCreador = {}): CatalogExercise[] {
  const actual = plan.dias[dia]?.ejercicios[indice]
  if (!actual) return []
  const enDia = new Set(plan.dias[dia].ejercicios.flatMap((e) => (e.catalogId ? [e.catalogId] : [])))
  return delPatron(actual.patron, material, ctx).filter((e) => !enDia.has(e.id)).sort((a, b) => Number(hechos.has(b.id)) - Number(hechos.has(a.id)))
}

/**
 * Cambia el ejercicio de un hueco por el elegido (sugerencia o selector). Conserva el hueco; el objetivo se rehace con el
 * tipo del nuevo si es del catálogo y, si no, se conserva.
 */
export function cambiarEjercicio(plan: PlanCreador, dia: number, indice: number, nuevo: { seleccion: SeleccionEjercicio; nombre: string; catalogId?: string }, objetivo: ObjetivoCreador): PlanCreador {
  const actual = plan.dias[dia]?.ejercicios[indice]
  if (!actual) return plan
  const catalogo = nuevo.catalogId ? CATALOGO_POR_ID.get(nuevo.catalogId) : undefined
  const tipo = catalogo?.tipo ?? actual.tipo
  return conEjercicio(plan, dia, indice, { ...actual, ...nuevo, catalogId: nuevo.catalogId, tipo, objetivo: catalogo ? { ...OBJETIVOS_POR_TIPO[objetivo][tipo] } : actual.objetivo })
}

/** El nombre o, si ya existe (sin distinguir mayúsculas ni tildes), «Nombre (2)», «Nombre (3)»… */
export function nombreLibre(nombre: string, ocupados: Iterable<string>): string {
  const usados = new Set([...ocupados].map(normalizeName))
  if (!usados.has(normalizeName(nombre))) return nombre
  for (let n = 2; ; n++) if (!usados.has(normalizeName(`${nombre} (${n})`))) return `${nombre} (${n})`
}

/** Rutinas a guardar, con nombres libres frente a las existentes y entre sí. */
export function rutinasDelPlan(plan: PlanCreador, existentes: Iterable<string>): { nombre: string; ejercicios: Pick<EjercicioPlan, 'seleccion' | 'objetivo'>[] }[] {
  const ocupados = [...existentes]
  return plan.dias.map((d) => {
    const nombre = nombreLibre(d.nombre, ocupados)
    ocupados.push(nombre)
    return { nombre, ejercicios: d.ejercicios.map(({ seleccion, objetivo }) => ({ seleccion, objetivo })) }
  })
}
