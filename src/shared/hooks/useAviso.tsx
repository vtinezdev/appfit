import { useCallback, useRef, useState, type ReactNode } from 'react'
import Toast from '../components/Toast'

export interface Aviso {
  mensaje: string
  error?: boolean
  /** Si se indica, el aviso muestra «Deshacer». Si falla, se avisa del error. */
  onDeshacer?: () => unknown
}

/**
 * Aviso temporal (Toast) de una pantalla: confirmaciones, errores recuperables y «Deshacer».
 * Renderiza `toast` una vez en la pantalla. Un aviso nuevo sustituye al visible.
 * Ojo: el Toast queda por debajo de los Sheet; dentro de un Sheet, los errores van en línea (ErrorState).
 */
export function useAviso(): {
  avisar: (aviso: Aviso) => void
  avisarError: (mensaje: string) => void
  toast: ReactNode
} {
  const [aviso, setAviso] = useState<(Aviso & { id: number }) | null>(null)
  const siguienteId = useRef(0)

  const avisar = useCallback((a: Aviso) => {
    siguienteId.current += 1
    setAviso({ ...a, id: siguienteId.current })
  }, [])

  const avisarError = useCallback((mensaje: string) => avisar({ mensaje, error: true }), [avisar])

  const onDeshacer = aviso?.onDeshacer
  const toast = aviso && (
    <Toast
      key={aviso.id}
      mensaje={aviso.mensaje}
      tono={aviso.error ? 'error' : 'default'}
      accion={
        onDeshacer
          ? {
              label: 'Deshacer',
              onClick: () => {
                Promise.resolve()
                  .then(onDeshacer)
                  .catch(() => avisarError('No se ha podido deshacer.'))
              },
            }
          : undefined
      }
      onCerrar={() => setAviso((actual) => (actual?.id === aviso.id ? null : actual))}
    />
  )

  return { avisar, avisarError, toast }
}
