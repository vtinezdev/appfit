import { useSyncExternalStore } from 'react'
import { leerDiaActual, observarDiaActual } from '../lib/diaActual'

export function useHoy() {
  return useSyncExternalStore(observarDiaActual, leerDiaActual, leerDiaActual)
}
