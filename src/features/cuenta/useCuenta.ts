import { useSyncExternalStore } from 'react'
import { copiaNube } from './servicio'
import type { EstadoCuenta } from './copiaNube'

/** Estado de la cuenta y de la copia en la nube, para la UI. */
export function useCuenta(): EstadoCuenta {
  return useSyncExternalStore(copiaNube.suscribir, copiaNube.leerEstado)
}
