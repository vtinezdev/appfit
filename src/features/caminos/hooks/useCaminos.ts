// Caminos desde el lector compartido (`experiencia/hooks/useProgreso`): misma firma de siempre.
import { useProgreso } from '../../experiencia/hooks/useProgreso'
import { caminosDe } from '../../experiencia/hooks/selectoresProgreso'
import type { EstadoCaminos } from './leerCaminos'

export { leerCaminos, type EstadoCaminos } from './leerCaminos'

/** Caminos hasta `hoy`. `undefined` mientras carga. */
export function useCaminos(hoy: string): EstadoCaminos | undefined {
  const e = useProgreso(hoy)
  return e && caminosDe(e)
}
