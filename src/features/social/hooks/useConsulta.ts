import { useCallback, useEffect, useState } from 'react'

export type Consulta<T> =
  | { estado: 'cargando'; datos?: T }
  | { estado: 'listo'; datos: T }
  | { estado: 'error'; error: string; datos?: T }

/**
 * Lee algo del servidor (la parte social no vive en Dexie: no hay `useLiveQuery`). Vuelve a leer cuando cambia
 * `clave` (p. ej. un contador que sube tras cada cambio) o con `recargar`; mientras tanto conserva lo anterior.
 */
export function useConsulta<T>(leer: () => Promise<T>, clave: unknown): Consulta<T> & { recargar: () => void } {
  const [consulta, setConsulta] = useState<Consulta<T>>({ estado: 'cargando' })
  const [vuelta, setVuelta] = useState(0)

  useEffect(() => {
    let vivo = true
    setConsulta((c) => ({ estado: 'cargando', datos: c.datos }))
    leer().then(
      (datos) => { if (vivo) setConsulta({ estado: 'listo', datos }) },
      (e: unknown) => { if (vivo) setConsulta((c) => ({ estado: 'error', error: e instanceof Error ? e.message : 'No se ha podido cargar.', datos: c.datos })) },
    )
    return () => { vivo = false }
    // `leer` cambia en cada render; lo que decide cuándo volver a leer es `clave`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, vuelta])

  const recargar = useCallback(() => setVuelta((v) => v + 1), [])
  return { ...consulta, recargar }
}
