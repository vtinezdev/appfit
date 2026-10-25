import type { SetEntry } from '../../../shared/db/types'
import { claveComparacion } from './ejecucion'
import { modoCarga } from './carga'

/** Aviso orientativo, nunca un límite. Solo compara series equivalentes de la última sesión. */
export function cargaInusual(serie: SetEntry, peso: number, previas: readonly SetEntry[]): number | null {
  if (!Number.isFinite(peso) || peso <= 0 || modoCarga(serie) === 'corporal' || serie.ejecucion === 'lados') return null
  const comparables = previas.filter(s => s.exerciseId === serie.exerciseId && s.realizada !== false && s.reps > 0 && s.peso > 0
    && (s.tipo === 'calentamiento') === (serie.tipo === 'calentamiento') && claveComparacion(s) === claveComparacion(serie))
  if (!comparables.length) return null
  const referencia = Math.max(...comparables.map(s => s.peso))
  return Math.abs(peso - referencia) >= 20 && (peso >= referencia * 3 || peso <= referencia / 3) ? referencia : null
}
