// Cumbres desde el lector compartido (`experiencia/hooks/useProgreso`): misma firma de siempre.
import { useProgreso } from '../../experiencia/hooks/useProgreso'
import { cumbresDe } from '../../experiencia/hooks/selectoresProgreso'
import type { EstadoCumbres } from './leerCumbres'

export { leerCumbres, type EstadoCumbres } from './leerCumbres'

/** Cumbres (y la experiencia) hasta `hoy`. `undefined` mientras carga. */
export function useCumbres(hoy: string): EstadoCumbres | undefined {
  const e = useProgreso(hoy)
  return e && cumbresDe(e)
}
