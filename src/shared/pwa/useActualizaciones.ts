import { useSyncExternalStore } from 'react'
import { actualizaciones } from './actualizaciones'

export function useActualizaciones() {
  return useSyncExternalStore(actualizaciones.suscribir, actualizaciones.getEstado)
}
