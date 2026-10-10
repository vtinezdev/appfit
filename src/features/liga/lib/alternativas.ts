// Alternativas a un ejercicio en Élite: del catálogo local y los propios, con el mismo músculo principal y, primero, las
// que están más frescas en su liga. Sugerencias, no una prescripción: no se cambia nada sin que el usuario lo decida.
import type { Exercise } from '../../../shared/db/types'
import { subtituloEjercicio } from '../../gym/lib/presentacionEjercicio'
import { catalogoDeLocal, opcionesEjercicios, type SeleccionEjercicio } from '../../gym/lib/selectorEjercicios'
import type { LigaEjercicio } from './liga'

/** Cuántas alternativas se proponen. */
export const MAX_ALTERNATIVAS = 5

export interface Alternativa {
  key: string
  nombre: string
  catalogId?: string
  /** «Pecho · mancuernas». */
  subtitulo: string
  /** «Nunca lo has hecho», «Sin liga ahora» o la división. */
  estado: string
  /** Para sustituirlo en una rutina (`routinesRepo.sustituirEjercicio`). */
  seleccion: SeleccionEjercicio
}

/** Músculos principales de un ejercicio guardado: los del catálogo si corresponde a uno; si no, los suyos. */
function principales(e: Exercise): string[] {
  return catalogoDeLocal(e)?.primaryMuscles ?? e.primaryMuscles ?? []
}

/**
 * Hasta `MAX_ALTERNATIVAS` ejercicios que comparten músculo principal con `e`, sin él mismo ni los que están en Élite.
 * Orden: división más baja primero; a igualdad, los ya hechos alguna vez (técnica conocida), los del mismo material y el
 * orden del catálogo. Sin músculo principal conocido, ninguna.
 */
export function alternativas(e: Exercise, locales: Exercise[], ligas: ReadonlyMap<number, LigaEjercicio>): Alternativa[] {
  const musculos = new Set(principales(e))
  if (!musculos.size) return []
  const propio = catalogoDeLocal(e)?.id
  const equipo = new Set(catalogoDeLocal(e)?.equipment ?? e.equipment ?? [])
  const candidatas = opcionesEjercicios(locales)
    .map((o, orden) => ({ o, orden, liga: o.localId === undefined ? undefined : ligas.get(o.localId) }))
    .filter(({ o, liga }) => o.localId !== e.id && (!propio || o.catalogId !== propio) && o.primaryMuscles.some((m) => musculos.has(m)) && !liga?.division.elite)
  const paso = (l?: LigaEjercicio) => l?.division.paso ?? 0
  candidatas.sort((a, b) => paso(a.liga) - paso(b.liga)
    || Number(!!b.liga) - Number(!!a.liga)
    || Number(b.o.equipment.some((q) => equipo.has(q))) - Number(a.o.equipment.some((q) => equipo.has(q)))
    || a.orden - b.orden)
  return candidatas.slice(0, MAX_ALTERNATIVAS).map(({ o, liga }) => ({
    key: o.key,
    nombre: o.name,
    catalogId: o.catalogId,
    subtitulo: subtituloEjercicio({ grupo: '', primaryMuscles: o.primaryMuscles, equipment: o.equipment }),
    estado: !liga ? 'Nunca lo has hecho' : liga.division.paso === 0 ? 'Sin liga ahora' : liga.division.nombre,
    seleccion: o.localId !== undefined ? { tipo: 'local', id: o.localId } : { tipo: 'catalogo', catalogId: o.catalogId! },
  }))
}
