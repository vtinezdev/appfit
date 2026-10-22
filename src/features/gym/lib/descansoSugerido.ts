import { CATALOGO_POR_ID } from './catalogoEjercicios'
import { OBJETIVOS_POR_TIPO } from './creadorRutinas'

/** Pista guardada en `Settings.pistasVistas` al responder: la propuesta sale una sola vez (ENT-14). */
export const PISTA_DESCANSO = 'entreno-descanso'

/**
 * Descanso que se propone a quien entrena sin temporizador: el mismo que pone el creador de rutinas (hipertrofia) según
 * el tipo del ejercicio del catálogo, 120 s compuesto y 90 s aislamiento. Un ejercicio propio no tiene tipo: 90 s.
 * Aparte de `session.ts` para no meter el catálogo en la barra del entreno minimizado.
 */
export function descansoSugerido(catalogId: string | undefined): number {
  const tipo = (catalogId && CATALOGO_POR_ID.get(catalogId)?.tipo) || 'aislamiento'
  return OBJETIVOS_POR_TIPO.hipertrofia[tipo].descansoSeg!
}

/** Si toca proponerlo: sesión sin temporizador, ejercicio sin descanso propio en la rutina y la pista sin responder. */
export function proponerDescanso(restSeconds: number, descansoRutina: number | undefined, pistasVistas: readonly string[] | undefined): boolean {
  return restSeconds === 0 && !(descansoRutina && descansoRutina > 0) && !pistasVistas?.includes(PISTA_DESCANSO)
}

/** «2 min», «90 s»: como en el selector de descanso, con minutos cuando son exactos. */
export const textoDescanso = (segundos: number) => (segundos % 60 === 0 ? `${segundos / 60} min` : `${segundos} s`)
