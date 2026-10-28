// Lista «Por ejercicio» de Progreso (punto 16): buscar por nombre, filtrar por grupos anchos y enseñar primero unos pocos.
import type { Exercise } from '../../../shared/db/types'
import { tokensConsulta } from '../../../shared/lib/text'
import { catalogoDeLocal } from './selectorEjercicios'

/** Grupos anchos, para que los filtros quepan en una fila (el selector de ejercicios usa los músculos finos). */
export const FAMILIAS_PROGRESO = { pecho: 'Pecho', espalda: 'Espalda', hombros: 'Hombros', brazos: 'Brazos', piernas: 'Piernas', core: 'Core' } as const
export type FamiliaProgreso = keyof typeof FAMILIAS_PROGRESO
const DE_MUSCULO: Record<string, FamiliaProgreso> = {
  pecho: 'pecho', espalda: 'espalda', hombros: 'hombros', biceps: 'brazos', triceps: 'brazos', antebrazo: 'brazos',
  cuadriceps: 'piernas', isquiotibiales: 'piernas', gluteos: 'piernas', aductores: 'piernas', gemelos: 'piernas', core: 'core',
}
/** Ejercicios que se ven antes de «Ver todos». */
export const PRIMEROS_PROGRESO = 6

/** El grupo ancho de un ejercicio por su músculo principal (el suyo o, en registros antiguos, el del catálogo). */
export function familiaDe(e: Exercise): FamiliaProgreso | null {
  const principal = e.primaryMuscles?.[0] ?? catalogoDeLocal(e)?.primaryMuscles[0]
  return (principal && DE_MUSCULO[principal]) || null
}

/** Ids en el orden dado que encajan con la búsqueda (por palabras, como el buscador) y con alguno de los grupos elegidos. */
export function filtrarPorEjercicio(ids: readonly number[], ejercicios: ReadonlyMap<number, Exercise>, consulta: string, familias: readonly FamiliaProgreso[]): number[] {
  const q = tokensConsulta(consulta)
  return ids.filter((id) => {
    const e = ejercicios.get(id)
    if (!e) return false
    if (familias.length && !familias.includes(familiaDe(e) as FamiliaProgreso)) return false
    const palabras = tokensConsulta(e.nombre)
    return q.every((t) => palabras.some((p) => p.startsWith(t)))
  })
}

/** Los grupos que tienen algún ejercicio de la lista, en el orden de `FAMILIAS_PROGRESO` (sin chips vacíos). */
export function familiasPresentes(ids: readonly number[], ejercicios: ReadonlyMap<number, Exercise>): Partial<Record<FamiliaProgreso, string>> {
  const hay = new Set(ids.map((id) => ejercicios.get(id)).flatMap((e) => (e ? [familiaDe(e)] : [])))
  return Object.fromEntries((Object.keys(FAMILIAS_PROGRESO) as FamiliaProgreso[]).filter((f) => hay.has(f)).map((f) => [f, FAMILIAS_PROGRESO[f]]))
}
