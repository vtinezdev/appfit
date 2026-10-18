import type { Exercise, SetEntry, Workout } from '../../../shared/db/types'
import { diasEntre, toISODate } from '../../../shared/lib/dates'
import { crearSnapshotMuscular } from './cargaMuscular'
import { formatInt } from '../../../shared/lib/format'
import { MUSCULOS, ZONAS_MUSCULARES, type ZonaMuscular } from './musculos'
import { esEfectiva } from './workout'

/**
 * Mapa muscular acumulado (ADR 046): series efectivas fraccionales cuyo calor se reduce a la mitad cada semana.
 * Heurística de trabajo registrado: no mide crecimiento, fatiga ni recuperación.
 */
export const CALOR_MUSCULAR = {
  principal: 1, secundario: 0.5,
  /** Días en que el calor de una serie se reduce a la mitad. */
  vidaMediaDias: 7,
  /** Series de un músculo en un mismo día que cuentan como máximo: un entreno suelto no pasa de «Moderado». */
  topeDia: 10,
  /** Más allá el calor es menor del 0,4 %: se ignora. */
  ventanaDias: 56,
  /** Ritmo equivalente (series/semana) desde el que empieza cada nivel 1–5. */
  umbrales: [0.5, 2, 5, 9, 14],
} as const

export type NivelCalor = 0 | 1 | 2 | 3 | 4 | 5
export const NIVELES_CALOR: Record<NivelCalor, string> = { 0: 'Sin calor reciente', 1: 'Muy bajo', 2: 'Bajo', 3: 'Moderado', 4: 'Alto', 5: 'Muy alto' }

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

export interface CalorMusculo {
  /** Σ series × 0,5^(días/7), con tope diario. */
  calor: number
  /** Calor × ln 2: se lee como series por semana sostenidas. */
  ritmo: number
  nivel: NivelCalor
  /** Trabajado alguna vez y ahora sin calor: se dibuja con contorno. */
  huella: boolean
  series7: number
  series28: number
  directas28: number
  indirectas28: number
  /** Semanas de las últimas 4 (contando desde hoy) con alguna serie. */
  semanas28: number
  /** Días desde la última serie; `null` si nunca. */
  diasDesde: number | null
  /** Ejercicios que más aportan en 28 días, de más a menos (como mucho 3). */
  ejercicios: { exerciseId: number; nombre: string; rol: 'principal' | 'secundario'; series: number }[]
}
export interface CalorMuscular {
  musculos: Record<ZonaMuscular, CalorMusculo>
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
      for (const musculo of principales) aportes.push({ workoutId: w.id, fecha, exerciseId, nombre, musculo, rol: 'principal', series: n * CALOR_MUSCULAR.principal })
      for (const musculo of secundarios) aportes.push({ workoutId: w.id, fecha, exerciseId, nombre, musculo, rol: 'secundario', series: n * CALOR_MUSCULAR.secundario })
    }
  }
  return { aportes, sinClasificar }
}

export function nivelCalor(ritmo: number): NivelCalor {
  let nivel = 0
  CALOR_MUSCULAR.umbrales.forEach((u, i) => { if (ritmo >= u) nivel = i + 1 })
  return nivel as NivelCalor
}

/** El mapa del día `hoy` (YYYY-MM-DD). Las series posteriores a `hoy` se ignoran. */
export function calorMuscular(aportes: AporteMuscular[], hoy: string, sinClasificar: SinClasificar[] = []): CalorMuscular {
  const porMusculo = new Map<ZonaMuscular, AporteMuscular[]>()
  for (const a of aportes) {
    if (diasEntre(a.fecha, hoy) < 0) continue
    const arr = porMusculo.get(a.musculo); if (arr) arr.push(a); else porMusculo.set(a.musculo, [a])
  }
  const musculos = Object.fromEntries(ZONAS_MUSCULARES.map((m) => [m, calcularMusculo(porMusculo.get(m) ?? [], hoy)])) as Record<ZonaMuscular, CalorMusculo>
  const recientes = sinClasificar.filter((s) => { const d = diasEntre(s.fecha, hoy); return d >= 0 && d < 28 })
  return {
    musculos,
    conDatos: ZONAS_MUSCULARES.some((m) => musculos[m].diasDesde !== null),
    sinClasificar28: { series: recientes.reduce((t, s) => t + s.series, 0), nombres: [...new Set(recientes.map((s) => s.nombre))] },
  }
}

function calcularMusculo(aportes: AporteMuscular[], hoy: string): CalorMusculo {
  const porDia = new Map<number, number>()
  const ejercicios = new Map<string, CalorMusculo['ejercicios'][number]>()
  const semanas = new Set<number>()
  let series7 = 0, series28 = 0, directas28 = 0, diasDesde: number | null = null
  for (const a of aportes) {
    const dias = diasEntre(a.fecha, hoy)
    diasDesde = diasDesde === null ? dias : Math.min(diasDesde, dias)
    if (dias < CALOR_MUSCULAR.ventanaDias) porDia.set(dias, (porDia.get(dias) ?? 0) + a.series)
    if (dias < 7) series7 += a.series
    if (dias >= 28) continue
    series28 += a.series
    if (a.rol === 'principal') directas28 += a.series
    semanas.add(Math.floor(dias / 7))
    const clave = `${a.exerciseId}:${a.rol}`
    const e = ejercicios.get(clave)
    if (e) e.series += a.series
    else ejercicios.set(clave, { exerciseId: a.exerciseId, nombre: a.nombre, rol: a.rol, series: a.series })
  }
  let calor = 0
  for (const [dias, series] of porDia) calor += Math.min(series, CALOR_MUSCULAR.topeDia) * 0.5 ** (dias / CALOR_MUSCULAR.vidaMediaDias)
  const ritmo = calor * Math.LN2
  const nivel = nivelCalor(ritmo)
  return {
    calor, ritmo, nivel, huella: nivel === 0 && diasDesde !== null,
    series7, series28, directas28, indirectas28: series28 - directas28, semanas28: semanas.size, diasDesde,
    ejercicios: [...ejercicios.values()].sort((a, b) => b.series - a.series || a.nombre.localeCompare(b.nombre, 'es')).slice(0, 3),
  }
}

/** Niveles y huella por zona, en la forma que pintan las figuras. */
export function nivelesDeCalor(c: CalorMuscular): { levels: Record<ZonaMuscular, NivelCalor>; huella: Record<ZonaMuscular, boolean> } {
  return {
    levels: Object.fromEntries(ZONAS_MUSCULARES.map((m) => [m, c.musculos[m].nivel])) as Record<ZonaMuscular, NivelCalor>,
    huella: Object.fromEntries(ZONAS_MUSCULARES.map((m) => [m, c.musculos[m].huella])) as Record<ZonaMuscular, boolean>,
  }
}

/** Para el resumen del bloque: los dos grupos con más calor y los dos con menos (solo con datos). */
export function resumenCalor(c: CalorMuscular): { masCalor: ZonaMuscular[]; pocoCalor: ZonaMuscular[] } {
  if (!c.conDatos) return { masCalor: [], pocoCalor: [] }
  const orden = [...ZONAS_MUSCULARES].sort((a, b) => c.musculos[b].ritmo - c.musculos[a].ritmo)
  const altos = orden.filter((m) => c.musculos[m].nivel >= 4)
  return {
    masCalor: (altos.length ? altos : orden.filter((m) => c.musculos[m].nivel > 0)).slice(0, 2),
    pocoCalor: orden.filter((m) => c.musculos[m].nivel <= 1).reverse().slice(0, 2),
  }
}

/** Grupos que suben de nivel con un entreno (para el antes → después al terminar), de más a menos subida. */
export function subidasDeNivel(antes: CalorMuscular, despues: CalorMuscular): ZonaMuscular[] {
  const sube = (m: ZonaMuscular) => despues.musculos[m].nivel - antes.musculos[m].nivel
  return ZONAS_MUSCULARES.filter((m) => sube(m) > 0).sort((a, b) => sube(b) - sube(a) || despues.musculos[b].ritmo - despues.musculos[a].ritmo)
}

/** «Sube Pecho a moderado, Tríceps a bajo y 2 más.» */
export function fraseSubidas(antes: CalorMuscular, despues: CalorMuscular): string {
  const suben = subidasDeNivel(antes, despues)
  if (!suben.length) return 'Ningún grupo cambia de nivel: tu mapa mantiene su calor.'
  const partes = suben.slice(0, 3).map((m) => `${MUSCULOS[m]} a ${NIVELES_CALOR[despues.musculos[m].nivel].toLowerCase()}`)
  if (suben.length > 3) partes.push(`${formatInt(suben.length - 3)} más`)
  return `Sube ${partes.length > 1 ? `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}` : partes[0]}.`
}
