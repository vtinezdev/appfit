import type { SetEntry } from '../../../shared/db/types'

/** 1RM estimado con la fórmula de Epley: peso * (1 + reps/30). */
export function epley1RM(peso: number, reps: number): number {
  if (reps <= 0 || peso <= 0) return 0
  if (reps === 1) return peso
  return Math.round(peso * (1 + reps / 30) * 10) / 10
}

export function volumenSets(sets: Pick<SetEntry, 'peso' | 'reps'>[]): number {
  return sets.reduce((acc, s) => acc + s.peso * s.reps, 0)
}

export function mejorSet(sets: Pick<SetEntry, 'peso' | 'reps'>[]): { peso: number; reps: number } | null {
  if (sets.length === 0) return null
  return sets.reduce((best, s) => (epley1RM(s.peso, s.reps) > epley1RM(best.peso, best.reps) ? s : best))
}

export function pesoMaximo(sets: Pick<SetEntry, 'peso'>[]): number {
  return sets.reduce((max, s) => Math.max(max, s.peso), 0)
}

/** Agrupa series por workoutId, útil para gráficas de progreso por sesión. */
export function agruparPorWorkout(sets: SetEntry[]): Map<number, SetEntry[]> {
  const map = new Map<number, SetEntry[]>()
  for (const s of sets) {
    const arr = map.get(s.workoutId) ?? []
    arr.push(s)
    map.set(s.workoutId, arr)
  }
  return map
}

export function formatUltimaVez(sets: Pick<SetEntry, 'peso' | 'reps'>[]): string {
  if (sets.length === 0) return 'Sin datos previos'
  const grupos = new Map<string, number>()
  for (const s of sets) {
    const key = `${s.reps}x${s.peso}`
    grupos.set(key, (grupos.get(key) ?? 0) + 1)
  }
  return Array.from(grupos.entries())
    .map(([key, count]) => (count > 1 ? `${count}×${key.split('x')[0]} @ ${key.split('x')[1]} kg` : `${key.replace('x', '×')} kg`))
    .join(', ')
}

/** Valores por defecto de una serie nueva: repite la última serie del ejercicio o, si no hay, 8 × 20 kg. */
export function valoresNuevaSerie(previa: Pick<SetEntry, 'peso' | 'reps'> | undefined): { reps: number; peso: number } {
  return { reps: previa?.reps ?? 8, peso: previa?.peso ?? 20 }
}

/** `orden` de la siguiente serie: uno más que el mayor existente (no el número de series, que se repite tras borrar). */
export function siguienteOrden(sets: Pick<SetEntry, 'orden'>[]): number {
  return sets.reduce((max, s) => Math.max(max, s.orden + 1), 0)
}

/** «52 min», «1 h 05 min», «2 h». Menos de un minuto: «menos de 1 min». */
export function formatDuracion(ms: number): string {
  const min = Math.round(Math.max(0, ms) / 60000)
  if (min < 1) return 'menos de 1 min'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const resto = min % 60
  return resto === 0 ? `${h} h` : `${h} h ${String(resto).padStart(2, '0')} min`
}

/** Hora local «18:05» de una marca de tiempo. */
export function formatHora(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export interface ResumenEntreno {
  /** «Hoy», «Ayer», «Hace 3 días» o «22 sept». */
  cuando: string
  duracion: string | null
  ejercicios: number
  /** kg totales (peso × reps). */
  volumen: number
}

const DIA_MS = 86_400_000

/** Resumen de un entreno terminado para las tarjetas de Inicio y Gym: cuándo fue, cuánto duró, cuántos ejercicios y qué volumen movió. */
export function resumenUltimoEntreno(
  workout: { inicio: number; fin?: number },
  sets: Pick<SetEntry, 'exerciseId' | 'peso' | 'reps'>[],
  ahora: Date = new Date(),
): ResumenEntreno {
  const inicio = new Date(workout.inicio)
  const diaInicio = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()).getTime()
  const diaHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime()
  const dias = Math.round((diaHoy - diaInicio) / DIA_MS)
  const cuando =
    dias <= 0 ? 'Hoy' : dias === 1 ? 'Ayer' : dias < 7 ? `Hace ${dias} días` : inicio.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  return {
    cuando,
    duracion: workout.fin !== undefined ? formatDuracion(workout.fin - workout.inicio) : null,
    ejercicios: new Set(sets.map((s) => s.exerciseId)).size,
    volumen: volumenSets(sets),
  }
}
