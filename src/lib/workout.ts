import type { SetEntry } from '../db'

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
