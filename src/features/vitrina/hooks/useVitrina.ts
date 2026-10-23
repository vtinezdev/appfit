// Vitrina desde el lector compartido (`experiencia/hooks/useProgreso`): misma firma de siempre.
import { useProgreso } from '../../experiencia/hooks/useProgreso'
import type { EstadoVitrina } from './leerVitrina'

export { leerVitrina, type EstadoVitrina } from './leerVitrina'

/** Vitrina de todo el historial hasta `hoy` (incluye la experiencia, Ritmo, Cumbres y Caminos). `undefined` mientras carga. */
export function useVitrina(hoy: string): EstadoVitrina | undefined {
  return useProgreso(hoy)
}
