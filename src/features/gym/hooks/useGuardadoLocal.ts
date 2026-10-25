import { useState, useSyncExternalStore } from 'react'
import { GuardadoLocal } from '../lib/guardadoLocal'

export function useGuardadoLocal() {
  const [guardado] = useState(() => new GuardadoLocal())
  const estado = useSyncExternalStore(guardado.suscribir, guardado.estado)
  return { guardado, ...estado }
}
