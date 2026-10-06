import type { Exercise, SetEntry } from '../../../shared/db/types'
import { normalizeName, tokensConsulta } from '../../../shared/lib/text'
import { CATALOGO_EJERCICIOS, CATALOGO_POR_ID, type CatalogExercise, type Musculo, type Equipo } from './catalogoEjercicios'

export type SeleccionEjercicio = { tipo: 'catalogo'; catalogId: string } | { tipo: 'local'; id: number } |
  { tipo: 'personalizado'; nombre: string; musculo: Musculo; equipo: Equipo }
/** Solo estos mensajes son aptos para mostrarse; los errores de almacenamiento usan feedback genérico. */
export class ErrorSeleccionEjercicio extends Error {}
export interface OpcionEjercicio {
  key: string
  name: string
  primaryMuscles: string[]
  secondaryMuscles: string[]
  equipment: string[]
  aliases: string[]
  filterGroups?: string[]
  localId?: number
  catalogId?: string
}

/** Solo equivalencias exactas para registros antiguos sin metadatos. Nunca enlazar por similitud. */
export function catalogoDeLocal(e: Exercise): CatalogExercise | undefined {
  if (e.catalogId) return CATALOGO_POR_ID.get(e.catalogId)
  if (e.primaryMuscles !== undefined || e.equipment !== undefined) return undefined
  return CATALOGO_EJERCICIOS.find(c => [c.name, ...(c.aliases ?? [])].some(n => normalizeName(n) === e.nombreNorm))
}

/** Mezcla de lectura: no instala el catálogo ni modifica ejercicios antiguos. */
export function opcionesEjercicios(locales: Exercise[]): OpcionEjercicio[] {
  const asociadas = new Map<string, Exercise>()
  for (const e of locales) {
    const c = catalogoDeLocal(e)
    if (c && !asociadas.has(c.id)) asociadas.set(c.id, e)
  }
  // Un nombre reservado por un personalizado no puede crear otra fila por el índice único existente.
  const nombresLocales = new Map(locales.map(e => [e.nombreNorm, e]))
  const oficiales = CATALOGO_EJERCICIOS.filter(c => !nombresLocales.has(normalizeName(c.name)) || asociadas.get(c.id)?.id === nombresLocales.get(normalizeName(c.name))?.id)
    .map(c => ({ key: c.id, name: asociadas.get(c.id)?.nombre ?? c.name, primaryMuscles: c.primaryMuscles, secondaryMuscles: c.secondaryMuscles, equipment: c.equipment, aliases: [c.name, ...(c.aliases ?? [])], filterGroups: c.filterGroups, catalogId: c.id, localId: asociadas.get(c.id)?.id }))
  const incluidas = new Set(oficiales.map(c => c.localId))
  return [...oficiales, ...locales.filter(e => !incluidas.has(e.id)).map(e => ({ key: `local:${e.id}`, name: e.nombre,
    primaryMuscles: e.primaryMuscles ?? [], secondaryMuscles: e.secondaryMuscles ?? [], equipment: e.equipment ?? [], aliases: [], localId: e.id, catalogId: e.catalogId }))]
}

/** Un error de una letra solo en palabras >=4; coincidencias directas siempre delante. */
function unaEdicion(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0, j = 0, errores = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue }
    if (++errores > 1) return false
    if (a.length <= b.length) j++
    if (a.length >= b.length) i++
  }
  return errores + (a.length - i) + (b.length - j) <= 1
}
export function filtrarEjercicios(opciones: OpcionEjercicio[], query: string, musculos: Musculo[], equipos: Equipo[]): OpcionEjercicio[] {
  const q = tokensConsulta(query)
  return opciones.flatMap(e => {
    if (musculos.length && !musculos.some(m => e.primaryMuscles.includes(m) || e.filterGroups?.includes(m))) return []
    if (equipos.length && !equipos.some(m => e.equipment.includes(m))) return []
    const words = tokensConsulta([e.name, ...e.aliases].join(' '))
    let score = 0
    for (const token of q) {
      if (words.some(w => w.startsWith(token))) continue
      if (token.length >= 4 && words.some(w => unaEdicion(token, w))) score++
      else return []
    }
    return [{ e, score }]
  }).sort((a, b) => a.score - b.score || a.e.name.localeCompare(b.e.name, 'es')).map(x => x.e)
}

/** Recientes por uso real, no por selección/cancelación del editor. */
export function recientesEjercicios(opciones: OpcionEjercicio[], series: SetEntry[], limit = 6): OpcionEjercicio[] {
  const porId = new Map(opciones.filter(e => e.localId !== undefined).map(e => [e.localId!, e]))
  const vistos = new Set<string>()
  return [...series].sort((a, b) => b.createdAt - a.createdAt || b.id - a.id).flatMap(s => {
    const e = porId.get(s.exerciseId)
    if (!e || vistos.has(e.key)) return []
    vistos.add(e.key)
    return [e]
  }).slice(0, limit)
}
