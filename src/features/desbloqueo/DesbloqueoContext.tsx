import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings } from '../../shared/db/settings'
import { useHoy } from '../../shared/hooks/useHoy'
import { calcularAcceso, dePagoBloqueado, type Acceso } from '../../shared/lib/acceso'
import { entornoAcceso } from '../../shared/pwa/cobro'
import DesbloquearSheet from './components/DesbloquearSheet'

interface ValorDesbloqueo {
  /** `undefined` mientras se leen los ajustes. */
  acceso: Acceso | undefined
  /** Lo de pago está en solo lectura (prueba terminada sin desbloquear). */
  bloqueado: boolean
  /** Abre la hoja «Cumbra Fit completa». */
  pedir: () => void
}

// Sin proveedor (tests de componentes sueltos), todo abierto.
const Contexto = createContext<ValorDesbloqueo>({ acceso: { tipo: 'abierto' }, bloqueado: false, pedir: () => {} })

/** ADR 068: el estado del acceso y la hoja para desbloquear, una sola para toda la app. */
export function DesbloqueoProvider({ children }: { children: ReactNode }) {
  const hoy = useHoy()
  const settings = useLiveQuery(() => getSettings(), [])
  const [abierta, setAbierta] = useState(false)
  const acceso = useMemo(() => (settings ? calcularAcceso(settings, entornoAcceso(), hoy) : undefined), [settings, hoy])
  const pedir = useCallback(() => setAbierta(true), [])
  const valor = useMemo(() => ({ acceso, bloqueado: acceso ? dePagoBloqueado(acceso) : false, pedir }), [acceso, pedir])
  return (
    <Contexto.Provider value={valor}>
      {children}
      <DesbloquearSheet open={abierta} acceso={acceso} onClose={() => setAbierta(false)} />
    </Contexto.Provider>
  )
}

/**
 * Para lo de pago: `bloqueado` y `pedir`, y `proteger(accion)`, que con la prueba terminada abre la hoja en vez de hacer
 * la acción. Borrar y deshacer no se protegen: lo apuntado sigue siendo de cada persona.
 */
export function useDePago() {
  const valor = useContext(Contexto)
  const { bloqueado, pedir } = valor
  const proteger = useCallback(<A extends unknown[]>(accion: (...args: A) => unknown) => (...args: A): void => {
    if (bloqueado) pedir()
    else void accion(...args)
  }, [bloqueado, pedir])
  return { ...valor, proteger }
}
