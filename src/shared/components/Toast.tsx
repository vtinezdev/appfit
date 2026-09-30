import { useEffect, useRef } from 'react'
import Icon from './Icon'

interface Props {
  mensaje: string
  accion?: { label: string; onClick: () => void }
  onCerrar: () => void
  duracionMs?: number
  /** `error` para un fallo recuperable: mismo aspecto sereno, con icono y `role="alert"` (no solo color). */
  tono?: 'default' | 'error'
}

/**
 * Aviso temporal (superficie ink: texto claro sobre negro, «Deshacer» en naranja) sobre la barra inferior flotante, con una acción opcional (p. ej. «Deshacer»).
 * Para mostrar uno nuevo mientras hay otro visible, cambia su `key` y el temporizador vuelve a empezar.
 * Flota justo encima de la barra de navegación, alineado con la columna de contenido también en escritorio.
 */
export default function Toast({ mensaje, accion, onCerrar, duracionMs = 5000, tono = 'default' }: Props) {
  const onCerrarRef = useRef(onCerrar)
  useEffect(() => {
    onCerrarRef.current = onCerrar
  })

  useEffect(() => {
    const t = setTimeout(() => onCerrarRef.current(), duracionMs)
    return () => clearTimeout(t)
  }, [duracionMs])

  const error = tono === 'error'
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-nav-toast z-40">
      <div className="mx-auto max-w-lg px-page">
        <div
          role={error ? 'alert' : 'status'}
          data-surface="ink"
          className="pointer-events-auto flex min-h-touch animate-rise-in items-center justify-between gap-3 rounded-lg bg-surface px-5 py-2 text-body-sm text-fg shadow-overlay"
        >
          <span className="flex min-w-0 items-center gap-2">
            {error && <Icon name="alert" size={18} className="text-destructive" />}
            <span className="min-w-0">{mensaje}</span>
          </span>
          {accion && (
            <button
              onClick={() => {
                accion.onClick()
                onCerrarRef.current()
              }}
              className="min-h-touch shrink-0 rounded-pill px-2 font-semibold text-accent-strong transition-opacity duration-short hover:opacity-80 active:opacity-70"
            >
              {accion.label}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
