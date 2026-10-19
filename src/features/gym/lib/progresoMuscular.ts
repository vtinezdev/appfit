import type { Exercise, Pausa, SetEntry, Workout } from '../../../shared/db/types'
import { addDays, diasEntre, startOfWeek, toISODate } from '../../../shared/lib/dates'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { pausaDeSemana } from '../../ritmo/lib/pausas'
import { crearSnapshotMuscular } from './cargaMuscular'
import { MUSCULOS, ZONAS_MUSCULARES, type ZonaMuscular } from './musculos'
import { esEfectiva } from './workout'

/**
 * Mapa muscular de progreso (ADR 051): semanas completas acumuladas por músculo, con un máximo que cuesta en torno a un año.
 * Heurística de constancia sobre el trabajo registrado: no mide crecimiento, fuerza, fatiga ni recuperación.
 */
export const PROGRESO_MUSCULAR = {
  principal: 1, secundario: 0.5,
  /** Series de una semana que la completan: 10 en los grupos grandes y 6 en los pequeños. Más no adelanta. */
  dosis: {
    pecho: 10, espalda: 10, hombros: 10, cuadriceps: 10, isquiotibiales: 10, gluteos: 10,
    biceps: 6, triceps: 6, antebrazo: 6, aductores: 6, gemelos: 6, core: 6,
  } satisfies Record<ZonaMuscular, number>,
  /** Lo indirecto (como secundario) completa como mucho esta parte de la semana. */
  topeIndirecto: 0.5,
  /** Una semana por debajo de esta parte de la dosis cuenta como semana sin trabajo. */
  mantenimiento: 0.3,
  /** Semanas sin trabajo seguidas que no restan. */
  semanasDeGracia: 2,
  /** Semanas completas que se pierden por cada semana sin trabajo tras la gracia. */
  perdidaSemanal: 1,
  /** Por debajo del máximo alcanzado, cada semana cuenta por este factor (memoria muscular). */
  memoria: 2,
  /** Semanas completas acumuladas desde las que empieza cada nivel 1–9. El último es el máximo. */
  umbrales: [1, 3, 6, 10, 16, 23, 30, 39, 48],
} as const

export const MAXIMO_PROGRESO = PROGRESO_MUSCULAR.umbrales.at(-1)!

export type NivelProgreso = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
export const TRAMOS_PROGRESO = ['Básico', 'Intermedio', 'Avanzado'] as const
const ROMANOS = ['I', 'II', 'III'] as const

/** «Básico I» … «Avanzado III»; 0, «Sin nivel». */
export function nombreNivel(nivel: NivelProgreso): string {
  return nivel === 0 ? 'Sin nivel' : `${TRAMOS_PROGRESO[Math.floor((nivel - 1) / 3)]} ${ROMANOS[(nivel - 1) % 3]}`
}

export function nivelProgreso(semanas: number): NivelProgreso {
  // Tolerancia: sumas de fracciones (0,1 + 0,2…) que deberían dar justo un umbral.
  return PROGRESO_MUSCULAR.umbrales.filter((u) => semanas + 1e-9 >= u).length as NivelProgreso
}

/** Series de un ejercicio que llegan a un músculo en un entreno terminado. */
export interface AporteMuscular {
  workoutId: number
  fecha: string
  exerciseId: number
  nombre: string
  musculo: ZonaMuscular
  rol: 'principal' | 'secundario'
  /** Series efectivas × rol (1 o 0,5). */
  series: number
}
export interface SinClasificar { workoutId: number; fecha: string; nombre: string; series: number }

/** Dónde está el músculo en su escalera ahora mismo. */
export type EstadoProgreso = 'sin-empezar' | 'avanzando' | 'en-gracia' | 'bajando' | 'en-pausa'

export interface ProgresoMusculo {
  /** Semanas completas acumuladas (0–48). */
  semanas: number
  nivel: NivelProgreso
  /** El nivel más alto alcanzado alguna vez. */
  nivelMaximo: NivelProgreso
  /** Perdió todo lo que tuvo: se dibuja con contorno. */
  huella: boolean
  /** Cada semana cuenta doble hasta volver al máximo alcanzado. */
  memoria: boolean
  estado: EstadoProgreso
  /** Semanas cerradas seguidas sin trabajo (sin contar las de pausa). */
  semanasSin: number
  /** Semanas completas que pide el siguiente nivel; `null` en el máximo. */
  siguiente: number | null
  /** Esta semana: series que cuentan (lo indirecto, con su tope) frente a la dosis. */
  semanaActual: { series: number; dosis: number }
  series7: number
  series28: number
  directas28: number
  indirectas28: number
  /** Días desde la última serie; `null` si nunca. */
  diasDesde: number | null
  /** Ejercicios que más aportan en 28 días, de más a menos (como mucho 3). */
  ejercicios: { exerciseId: number; nombre: string; rol: 'principal' | 'secundario'; series: number }[]
}
export interface ProgresoMuscular {
  musculos: Record<ZonaMuscular, ProgresoMusculo>
  /** Hay alguna serie clasificada, de cuando sea. */
  conDatos: boolean
  /** Series efectivas de los últimos 28 días sin músculo clasificado y sus ejercicios. */
  sinClasificar28: { series: number; nombres: string[] }
}

const zonas = new Set<string>(ZONAS_MUSCULARES)
const finito = (n: number) => Number.isFinite(n) && n > 0

/**
 * Reparte las series efectivas (sin calentamientos ni pendientes, con reps) de los entrenos terminados entre sus músculos,
 * con la clasificación guardada en cada entreno o, si no la tiene, la actual. Un músculo en las dos listas cuenta como principal.
 */
export function aportesMusculares(workouts: Workout[], sets: SetEntry[], exercises: Exercise[]): { aportes: AporteMuscular[]; sinClasificar: SinClasificar[] } {
  const porWorkout = new Map<number, SetEntry[]>()
  for (const s of sets) { const arr = porWorkout.get(s.workoutId); if (arr) arr.push(s); else porWorkout.set(s.workoutId, [s]) }
  const aportes: AporteMuscular[] = [], sinClasificar: SinClasificar[] = []
  for (const w of workouts) {
    if (w.fin === undefined) continue
    const ss = porWorkout.get(w.id) ?? []
    const fecha = toISODate(new Date(w.inicio))
    const clasificacion = new Map((w.muscleSnapshot ?? crearSnapshotMuscular(ss, exercises)).exercises.map((e) => [e.exerciseId, e]))
    const series = new Map<number, number>()
    for (const s of ss) if (esEfectiva(s) && finito(s.reps)) series.set(s.exerciseId, (series.get(s.exerciseId) ?? 0) + 1)
    for (const [exerciseId, n] of series) {
      const c = clasificacion.get(exerciseId)
      const principales = [...new Set(c?.primaryMuscles ?? [])].filter((m) => zonas.has(m)) as ZonaMuscular[]
      if (!principales.length) { sinClasificar.push({ workoutId: w.id, fecha, nombre: c?.nombre ?? 'Ejercicio no disponible', series: n }); continue }
      const secundarios = [...new Set(c?.secondaryMuscles ?? [])].filter((m) => zonas.has(m) && !principales.includes(m as ZonaMuscular)) as ZonaMuscular[]
      const nombre = c!.nombre
      for (const musculo of principales) aportes.push({ workoutId: w.id, fecha, exerciseId, nombre, musculo, rol: 'principal', series: n * PROGRESO_MUSCULAR.principal })
      for (const musculo of secundarios) aportes.push({ workoutId: w.id, fecha, exerciseId, nombre, musculo, rol: 'secundario', series: n * PROGRESO_MUSCULAR.secundario })
    }
  }
  return { aportes, sinClasificar }
}

/** Series de una semana que cuentan: las directas y lo indirecto hasta su tope. */
function seriesQueCuentan(directas: number, indirectas: number, dosis: number): number {
  return directas + Math.min(indirectas, dosis * PROGRESO_MUSCULAR.topeIndirecto)
}

/** El mapa del día `hoy` (YYYY-MM-DD). Las series posteriores a `hoy` se ignoran; las semanas en pausa de Ritmo no restan. */
export function progresoMuscular(aportes: AporteMuscular[], hoy: string, sinClasificar: SinClasificar[] = [], pausas?: readonly Pausa[]): ProgresoMuscular {
  const porMusculo = new Map<ZonaMuscular, AporteMuscular[]>()
  for (const a of aportes) {
    if (diasEntre(a.fecha, hoy) < 0) continue
    const arr = porMusculo.get(a.musculo); if (arr) arr.push(a); else porMusculo.set(a.musculo, [a])
  }
  const pausaCache = new Map<string, boolean>()
  const enPausa = (lunes: string) => {
    let v = pausaCache.get(lunes)
    if (v === undefined) pausaCache.set(lunes, (v = pausaDeSemana(pausas, lunes) !== null))
    return v
  }
  const musculos = Object.fromEntries(ZONAS_MUSCULARES.map((m) => [m, calcularMusculo(m, porMusculo.get(m) ?? [], hoy, enPausa)])) as Record<ZonaMuscular, ProgresoMusculo>
  const recientes = sinClasificar.filter((s) => { const d = diasEntre(s.fecha, hoy); return d >= 0 && d < 28 })
  return {
    musculos,
    conDatos: ZONAS_MUSCULARES.some((m) => musculos[m].diasDesde !== null),
    sinClasificar28: { series: recientes.reduce((t, s) => t + s.series, 0), nombres: [...new Set(recientes.map((s) => s.nombre))] },
  }
}

function calcularMusculo(musculo: ZonaMuscular, aportes: AporteMuscular[], hoy: string, enPausa: (lunes: string) => boolean): ProgresoMusculo {
  const P = PROGRESO_MUSCULAR
  const dosis = P.dosis[musculo]
  const porSemana = new Map<string, { directas: number; indirectas: number }>()
  const ejercicios = new Map<string, ProgresoMusculo['ejercicios'][number]>()
  let series7 = 0, series28 = 0, directas28 = 0, diasDesde: number | null = null, primera: string | null = null
  for (const a of aportes) {
    const dias = diasEntre(a.fecha, hoy)
    diasDesde = diasDesde === null ? dias : Math.min(diasDesde, dias)
    const lunes = startOfWeek(a.fecha)
    if (primera === null || lunes < primera) primera = lunes
    const s = porSemana.get(lunes) ?? { directas: 0, indirectas: 0 }
    if (a.rol === 'principal') s.directas += a.series; else s.indirectas += a.series
    porSemana.set(lunes, s)
    if (dias < 7) series7 += a.series
    if (dias >= 28) continue
    series28 += a.series
    if (a.rol === 'principal') directas28 += a.series
    const clave = `${a.exerciseId}:${a.rol}`
    const e = ejercicios.get(clave)
    if (e) e.series += a.series
    else ejercicios.set(clave, { exerciseId: a.exerciseId, nombre: a.nombre, rol: a.rol, series: a.series })
  }

  const lunesHoy = startOfWeek(hoy)
  let semanas = 0, pico = 0, sin = 0, pausaAhora = false
  for (let lunes = primera; lunes !== null && lunes <= lunesHoy; lunes = addDays(lunes, 7)) {
    const s = porSemana.get(lunes)
    const credito = s ? Math.min(seriesQueCuentan(s.directas, s.indirectas, dosis) / dosis, 1) : 0
    const actual = lunes === lunesHoy
    const pausada = enPausa(lunes)
    if (actual) pausaAhora = pausada
    if (credito >= P.mantenimiento) {
      sin = 0
      semanas = Math.min(MAXIMO_PROGRESO, semanas + credito * (semanas < pico ? P.memoria : 1))
    } else if (actual || pausada) {
      // La semana en curso aún puede completarse y una pausa congela: suman lo poco que haya, sin restar.
      semanas = Math.min(MAXIMO_PROGRESO, semanas + credito)
    } else if (++sin > P.semanasDeGracia) {
      semanas = Math.max(0, semanas - P.perdidaSemanal)
    } else {
      semanas = Math.min(MAXIMO_PROGRESO, semanas + credito)
    }
    pico = Math.max(pico, semanas)
  }

  const nivel = nivelProgreso(semanas)
  const nivelMaximo = nivelProgreso(pico)
  const actual = porSemana.get(lunesHoy)
  const semanaActual = { series: actual ? seriesQueCuentan(actual.directas, actual.indirectas, dosis) : 0, dosis }
  const estado: EstadoProgreso = primera === null ? 'sin-empezar'
    : sin > P.semanasDeGracia ? 'bajando'
      : pausaAhora && semanaActual.series < dosis * P.mantenimiento ? 'en-pausa'
        : sin > 0 ? 'en-gracia' : 'avanzando'
  return {
    semanas, nivel, nivelMaximo,
    huella: nivel === 0 && nivelMaximo > 0,
    memoria: semanas < pico - 1e-9,
    estado, semanasSin: sin,
    siguiente: nivel < 9 ? (P.umbrales as readonly number[])[nivel] : null,
    semanaActual,
    series7, series28, directas28, indirectas28: series28 - directas28, diasDesde,
    ejercicios: [...ejercicios.values()].sort((a, b) => b.series - a.series || a.nombre.localeCompare(b.nombre, 'es')).slice(0, 3),
  }
}

/** Niveles y huella por zona, en la forma que pintan las figuras. */
export function nivelesDeProgreso(p: ProgresoMuscular): { levels: Record<ZonaMuscular, NivelProgreso>; huella: Record<ZonaMuscular, boolean> } {
  return {
    levels: Object.fromEntries(ZONAS_MUSCULARES.map((m) => [m, p.musculos[m].nivel])) as Record<ZonaMuscular, NivelProgreso>,
    huella: Object.fromEntries(ZONAS_MUSCULARES.map((m) => [m, p.musculos[m].huella])) as Record<ZonaMuscular, boolean>,
  }
}

/** Para el resumen del bloque: los dos grupos más avanzados y los dos que más pueden crecer (solo con datos). */
export function resumenProgreso(p: ProgresoMuscular): { masAvanzados: ZonaMuscular[]; porDesarrollar: ZonaMuscular[] } {
  if (!p.conDatos) return { masAvanzados: [], porDesarrollar: [] }
  const orden = [...ZONAS_MUSCULARES].sort((a, b) => p.musculos[b].semanas - p.musculos[a].semanas || MUSCULOS[a].localeCompare(MUSCULOS[b], 'es'))
  const masAvanzados = orden.filter((m) => p.musculos[m].nivel > 0).slice(0, 2)
  return { masAvanzados, porDesarrollar: orden.filter((m) => !masAvanzados.includes(m)).reverse().slice(0, 2) }
}

/** Grupos que suben de nivel con un entreno, de más a menos subida. */
export function subidasDeNivel(antes: ProgresoMuscular, despues: ProgresoMuscular): ZonaMuscular[] {
  const sube = (m: ZonaMuscular) => despues.musculos[m].nivel - antes.musculos[m].nivel
  return ZONAS_MUSCULARES.filter((m) => sube(m) > 0).sort((a, b) => sube(b) - sube(a) || despues.musculos[b].semanas - despues.musculos[a].semanas)
}

/** «Pecho sube a Intermedio II, Tríceps a Básico III y 2 más.» */
export function fraseSubidas(antes: ProgresoMuscular, despues: ProgresoMuscular): string {
  const suben = subidasDeNivel(antes, despues)
  if (!suben.length) return 'Ningún grupo cambia de nivel hoy: cada semana completa te acerca al siguiente.'
  const partes = suben.slice(0, 3).map((m, i) => `${MUSCULOS[m]}${i === 0 ? ' sube' : ''} a ${nombreNivel(despues.musculos[m].nivel)}`)
  if (suben.length > 3) partes.push(`${formatInt(suben.length - 3)} más`)
  return `${partes.length > 1 ? `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}` : partes[0]}.`
}

/** Los grupos que trabaja un entreno, de más a menos series. */
export function musculosDelEntreno(aportes: AporteMuscular[], workoutId: number): ZonaMuscular[] {
  const series = new Map<ZonaMuscular, number>()
  for (const a of aportes) if (a.workoutId === workoutId) series.set(a.musculo, (series.get(a.musculo) ?? 0) + a.series)
  return [...series.keys()].sort((a, b) => series.get(b)! - series.get(a)! || MUSCULOS[a].localeCompare(MUSCULOS[b], 'es'))
}

const semanasTexto = (n: number) => `${formatInt(n)} ${n === 1 ? 'semana' : 'semanas'}`

/** Qué está pasando con el grupo y qué lo mueve, en una frase. */
export function textoEstado(m: ProgresoMusculo): string {
  const P = PROGRESO_MUSCULAR
  switch (m.estado) {
    case 'sin-empezar': return `Una semana con ${formatInt(m.semanaActual.dosis)} series de este grupo lo lleva a Básico I.`
    case 'en-pausa': return 'Estás en una pausa de Ritmo: mientras dure, no baja.'
    case 'bajando': return `Lleva ${semanasTexto(m.semanasSin)} sin trabajarlo: pierde una semana completa por cada semana más sin trabajo.`
    case 'en-gracia': return m.semanasSin < P.semanasDeGracia
      ? `Lleva ${semanasTexto(m.semanasSin)} sin trabajarlo; empieza a bajar a la ${formatInt(P.semanasDeGracia + 1)}.ª seguida.`
      : `Lleva ${semanasTexto(m.semanasSin)} sin trabajarlo: si esta semana tampoco llega al ${formatInt(P.mantenimiento * 100)} %, empieza a bajar.`
    default:
      if (m.memoria) return `Recuperando: cada semana cuenta doble hasta volver a donde llegaste (${nombreNivel(m.nivelMaximo)}).`
      if (m.siguiente === null) return 'Nivel máximo. Para mantenerlo, sigue trabajándolo cada semana.'
      return `Cada semana con ${formatInt(m.semanaActual.dosis)} series suma una semana completa; con menos, la parte que hagas.`
  }
}

/** Lo que lleva la semana en curso: «7 de 10 series» o «Semana completa». */
export function textoSemana(m: ProgresoMusculo): string {
  const { series, dosis } = m.semanaActual
  return series >= dosis ? 'Semana completa' : `${formatNumber(series, 1)} de ${formatInt(dosis)} series`
}
