// Básicos de la Liga: ejercicios que se suelen mantener durante años. En Élite no avisan durante el entreno.
import type { Exercise } from '../../../shared/db/types'
import { catalogoDeLocal } from '../../gym/lib/selectorEjercicios'
import type { LigaEjercicio } from './liga'

/** Lista editorial por id del catálogo (gaming.md, decidida con Víctor el 2026-10-10). */
export const BASICOS: ReadonlySet<string> = new Set([
  'appfit:sentadilla',
  'appfit:press-banca',
  'appfit:peso-muerto',
  'appfit:press-militar',
  'appfit:dominadas',
  'appfit:remo-barra',
])

/** Un ejercicio guardado es básico si corresponde a uno de la lista (por `catalogId` o por nombre exacto antiguo). */
export function esBasico(e: Exercise): boolean {
  const c = catalogoDeLocal(e)
  return !!c && BASICOS.has(c.id)
}

/** El aviso suave de Élite: no en los básicos ni en los ejercicios que el usuario decidió mantener. */
export function avisarElite(l: LigaEjercicio, e: Exercise, mantener: readonly number[] = []): boolean {
  return l.division.elite && !esBasico(e) && !mantener.includes(e.id)
}
