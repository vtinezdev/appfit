import type { Exercise, Routine, SetEntry, Workout } from '../../../shared/db/types'
import { formatInt } from '../../../shared/lib/format'
import { crearSnapshotMuscular, ESTIMULO_MUSCULAR, normalizarCargaMuscular, type NivelMuscular } from './cargaMuscular'
import { pesoComparable, repsComparables } from './ejecucion'
import { pastillaSerie } from './fichaEntreno'
import { ZONAS_MUSCULARES, type ZonaMuscular } from './musculos'
import { OBJETIVO_POR_DEFECTO } from './objetivos'
import { recordsDeEntreno } from './records'
import { agruparPorWorkout, esEfectiva, volumenSets } from './workout'

/**
 * Presentación de una rutina en su tarjeta y en su ficha: qué músculos trabaja, la tira de miniaturas, sus últimas
 * sesiones y la última serie de cada ejercicio. Todo sale de la rutina y del historial real, sin estimaciones.
 */

export interface MusculosRutina {
  /** Nivel relativo de cada zona (la más trabajada de la rutina = 5), para el mapa. */
  levels: Record<ZonaMuscular, NivelMuscular>
  /** Zonas con trabajo, de más a menos. */
  principales: { zona: ZonaMuscular; nivel: NivelMuscular }[]
}

/**
 * Músculos de una rutina con la clasificación vigente de sus ejercicios: cada serie objetivo suma 1 a sus músculos
 * principales y 0,5 a los secundarios (como en el mapa de una sesión). Sin objetivo cuentan las series por defecto.
 */
export function musculosRutina(r: Pick<Routine, 'exerciseIds' | 'objetivos'>, ejercicios: Exercise[]): MusculosRutina {
  const zonas = new Set<string>(ZONAS_MUSCULARES)
  const scores: Partial<Record<ZonaMuscular, number>> = {}
  const sumar = (m: ZonaMuscular, n: number) => { scores[m] = (scores[m] ?? 0) + n }
  for (const e of crearSnapshotMuscular(r.exerciseIds.map(exerciseId => ({ exerciseId })), ejercicios).exercises) {
    const series = r.objetivos?.[e.exerciseId]?.series ?? OBJETIVO_POR_DEFECTO.series
    const primarios = e.primaryMuscles.filter((m): m is ZonaMuscular => zonas.has(m))
    for (const m of primarios) sumar(m, series * ESTIMULO_MUSCULAR.primary)
    for (const m of e.secondaryMuscles.filter((m): m is ZonaMuscular => zonas.has(m) && !primarios.includes(m as ZonaMuscular))) sumar(m, series * ESTIMULO_MUSCULAR.secondary)
  }
  const levels = normalizarCargaMuscular(scores)
  const principales = ZONAS_MUSCULARES.filter(m => levels[m] > 0).sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0)).map(zona => ({ zona, nivel: levels[zona] }))
  return { levels, principales }
}

/** Miniaturas de la tarjeta: todas si caben en `max`; si no, `max - 1` y el hueco final dice cuántas faltan («+3»). */
export function tiraMiniaturas<T>(miniaturas: T[], max = 5): { visibles: T[]; mas: number } {
  if (miniaturas.length <= max) return { visibles: miniaturas, mas: 0 }
  return { visibles: miniaturas.slice(0, max - 1), mas: miniaturas.length - (max - 1) }
}

export interface SesionRutina {
  id: number
  inicio: number
  fin: number
  volumen: number
  records: number
}

/** Entrenos terminados con esta rutina: cuántos hay y los `max` más recientes con su volumen y récords. */
export function sesionesRutina(routineId: number, workouts: Workout[], sets: SetEntry[], max = 3): { total: number; ultimas: SesionRutina[] } {
  const hechas = workouts.filter((w): w is Workout & { fin: number } => w.routineId === routineId && w.fin !== undefined).sort((a, b) => b.inicio - a.inicio)
  const terminados = workouts.filter(w => w.fin !== undefined)
  const porWorkout = agruparPorWorkout(sets)
  return {
    total: hechas.length,
    ultimas: hechas.slice(0, max).map(w => ({
      id: w.id, inicio: w.inicio, fin: w.fin, volumen: volumenSets(porWorkout.get(w.id) ?? []),
      records: recordsDeEntreno(w.id, terminados, sets).length,
    })),
  }
}

/**
 * La mejor serie efectiva de cada ejercicio en su último entreno terminado (con esta rutina o sin ella), como texto de
 * pastilla («82,5 kg × 7»). Mejor = más peso comparable y, a igual peso, más repeticiones. Sin historial, no aparece.
 */
export function ultimaVezEjercicios(ids: number[], workouts: Workout[], sets: SetEntry[]): Map<number, string> {
  const terminados = workouts.filter(w => w.fin !== undefined).sort((a, b) => b.inicio - a.inicio)
  const porWorkout = agruparPorWorkout(sets.filter(esEfectiva))
  const pendientes = new Set(ids)
  const result = new Map<number, string>()
  for (const w of terminados) {
    if (!pendientes.size) break
    for (const id of [...pendientes]) {
      const delEjercicio = (porWorkout.get(w.id) ?? []).filter(s => s.exerciseId === id)
      if (!delEjercicio.length) continue
      const mejor = delEjercicio.reduce((a, b) => (pesoComparable(b) > pesoComparable(a) || (pesoComparable(b) === pesoComparable(a) && repsComparables(b) > repsComparables(a)) ? b : a))
      result.set(id, pastillaSerie(mejor).texto)
      pendientes.delete(id)
    }
  }
  return result
}

/** «6 ejercicios · 18 series»; sin objetivos, solo los ejercicios. */
export function cifrasRutina(ejercicios: number, series: number | null): string {
  return [`${formatInt(ejercicios)} ${ejercicios === 1 ? 'ejercicio' : 'ejercicios'}`, series !== null ? `${formatInt(series)} ${series === 1 ? 'serie' : 'series'}` : null].filter(Boolean).join(' · ')
}
