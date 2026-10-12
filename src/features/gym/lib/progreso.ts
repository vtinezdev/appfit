import { claveComparacion, repsComparables, pesoComparable } from './ejecucion'
import type { ModoCarga, SetEntry, Workout } from '../../../shared/db/types'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { modoCarga } from './carga'
import { efectivas, epley1RM, volumenSets } from './workout'

export interface MejorSerie { peso: number; reps: number }

/** Más carga y, a igual carga, más reps; con asistencia, menos ayuda; con peso corporal, más reps. */
function mejorQue(a: MejorSerie, b: MejorSerie, modo: ModoCarga): boolean {
  if (modo === 'corporal') return a.reps > b.reps
  if (a.peso !== b.peso) return modo === 'asistencia' ? a.peso < b.peso : a.peso > b.peso
  return a.reps > b.reps
}
function mejorDe<T extends MejorSerie>(series: T[], modo: ModoCarga): T {
  return series.reduce((m, s) => (mejorQue(s, m, modo) ? s : m))
}

/** Solo sesiones terminadas y series del mismo modo; asistencia no invierte la progresión. */
export function datosProgreso(series: SetEntry[], workouts: Pick<Workout, 'id' | 'inicio' | 'fin'>[], modo: ModoCarga, variante?: string) {
  const sesiones = new Map(workouts.filter(w => w.fin !== undefined).map(w => [w.id, w]))
  const grupos = new Map<number, SetEntry[]>()
  for (const s of efectivas(series).filter(s => repsComparables(s) > 0 && !s.bajadas?.length && modoCarga(s) === modo && claveComparacion(s) === (variante ?? claveComparacion({ modoCarga: modo })))) {
    if (!sesiones.has(s.workoutId)) continue
    grupos.set(s.workoutId, [...(grupos.get(s.workoutId) ?? []), s])
  }
  return [...grupos].map(([workoutId, ss]) => ({
    workoutId, inicio: sesiones.get(workoutId)!.inicio,
    pesoMax: Math.max(...ss.map(pesoComparable)),
    oneRM: modo === 'externa' && !ss[0].ejecucion && !ss[0].excentricaSeg && !ss[0].soloNegativas ? Math.max(...ss.map(s => epley1RM(s.peso, s.reps))) : null,
    asistencia: modo === 'asistencia' ? Math.min(...ss.map(pesoComparable)) : null,
    reps: Math.max(...ss.map(repsComparables)), volumen: volumenSets(ss),
    mejor: mejorDe(ss.map(s => ({ peso: pesoComparable(s), reps: repsComparables(s) })), modo),
  })).sort((a, b) => a.inicio - b.inicio || a.workoutId - b.workoutId)
}
export type SesionProgreso = ReturnType<typeof datosProgreso>[number]
export type MetricaProgreso = 'pesoMax' | 'oneRM' | 'volumen' | 'reps' | 'asistencia'

/** «100 kg × 5», «+10 kg × 6» (lastre), «−20 kg × 8» (ayuda) o «12 reps» (corporal). */
export function textoMejorSerie(m: MejorSerie, modo: ModoCarga): string {
  const kg = `${formatNumber(m.peso, 2)} kg`
  if (modo === 'corporal') return `${formatInt(m.reps)} reps`
  return `${modo === 'lastre' ? '+' : modo === 'asistencia' ? '−' : ''}${kg} × ${formatInt(m.reps)}`
}

/** Tres cifras clave del periodo mostrado: mejor serie (y cuándo), 1RM estimado máximo y cambio de la métrica entre la primera y la última sesión. */
export function cifrasClave(datos: SesionProgreso[], metrica: MetricaProgreso, modo: ModoCarga) {
  if (!datos.length) return null
  const mejor = mejorDe(datos.map(d => ({ ...d.mejor, inicio: d.inicio })), modo)
  const rms = datos.map(d => d.oneRM).filter((v): v is number => v !== null)
  const valor = (d: SesionProgreso) => d[metrica] ?? 0
  return {
    mejor,
    oneRM: rms.length ? Math.max(...rms) : null,
    cambio: datos.length >= 2 ? valor(datos[datos.length - 1]) - valor(datos[0]) : null,
  }
}

export interface ResumenEjercicioProgreso {
  exerciseId: number
  modo: ModoCarga
  metrica: MetricaProgreso
  /** Última sesión terminada (su mejor serie y su fecha). */
  ultima: SesionProgreso
  /** Valores de la métrica en las últimas sesiones, de la más antigua a la más reciente (para la minigráfica). */
  puntos: number[]
  sesiones: number
}

/** Métrica por defecto de un modo, la misma que abre la gráfica: 1RM si se puede estimar, si no carga, ayuda o reps. */
function metricaPorDefecto(modo: ModoCarga, datos: SesionProgreso[]): MetricaProgreso {
  if (modo === 'externa') return datos.some(d => d.oneRM !== null) ? 'oneRM' : 'pesoMax'
  return modo === 'lastre' ? 'pesoMax' : modo === 'asistencia' ? 'asistencia' : 'reps'
}

/**
 * Lista de Progreso antes de elegir ejercicio: cada ejercicio con sesiones terminadas, con el mismo modo y variante que
 * abriría su gráfica (los primeros registrados), su última mejor serie y los últimos `n` valores. Más reciente primero.
 */
export function resumenEjercicios(series: SetEntry[], workouts: Pick<Workout, 'id' | 'inicio' | 'fin'>[], n = 8): ResumenEjercicioProgreso[] {
  const porEjercicio = new Map<number, SetEntry[]>()
  for (const s of series) porEjercicio.set(s.exerciseId, [...(porEjercicio.get(s.exerciseId) ?? []), s])
  const out: ResumenEjercicioProgreso[] = []
  for (const [exerciseId, ss] of porEjercicio) {
    const modo = modoCarga(ss[0])
    const variante = ss.filter(s => modoCarga(s) === modo && !s.bajadas?.length).map(claveComparacion)[0]
    const datos = datosProgreso(ss, workouts, modo, variante)
    if (!datos.length) continue
    const metrica = metricaPorDefecto(modo, datos)
    out.push({ exerciseId, modo, metrica, ultima: datos[datos.length - 1], puntos: datos.slice(-n).map(d => d[metrica] ?? 0), sesiones: datos.length })
  }
  return out.sort((a, b) => b.ultima.inicio - a.ultima.inicio || a.exerciseId - b.exerciseId)
}

/** Trazo de una minigráfica en un lienzo `ancho` × `alto`, ceñido al mínimo y al máximo; null con menos de dos puntos. */
export function trazoMini(valores: number[], ancho: number, alto: number, margen = 2): { d: string; ultimo: { x: number; y: number } } | null {
  if (valores.length < 2) return null
  const min = Math.min(...valores), max = Math.max(...valores)
  const xy = valores.map((v, i) => [
    Math.round((margen + (i / (valores.length - 1)) * (ancho - 2 * margen)) * 10) / 10,
    Math.round((max === min ? alto / 2 : margen + ((max - v) / (max - min)) * (alto - 2 * margen)) * 10) / 10,
  ] as const)
  return { d: xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(''), ultimo: { x: xy[xy.length - 1][0], y: xy[xy.length - 1][1] } }
}
