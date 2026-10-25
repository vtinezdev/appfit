// Experiencia (y Ritmo) desde el lector compartido (`useProgreso`): misma firma de siempre.
import { useProgreso } from './useProgreso'
import { experienciaDe } from './selectoresProgreso'
import type { EstadoExperiencia } from './leerExperiencia'

export { leerExperiencia, type EstadoExperiencia } from './leerExperiencia'

/** Experiencia (y Ritmo) de todo el historial hasta `hoy`. `undefined` mientras carga. */
export function useExperiencia(hoy: string): EstadoExperiencia | undefined {
  const e = useProgreso(hoy)
  return e && experienciaDe(e)
}
