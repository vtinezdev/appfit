import { useId, useLayoutEffect, useRef, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useModalLayer } from '../hooks/useModalLayer'
import { useOverlayPresence } from '../hooks/useOverlayPresence'
import { IconButton } from './Button'

interface Props {
  /** Identidad del panel cuando un control externo usa aria-controls. */
  id?: string
  open: boolean
  onClose: () => void
  /** Frontera real de salida, también cuando el padre cambia open a false. */
  onExited?: () => void
  title?: string
  /** Debajo del título: de qué trata la hoja (el alimento o la receta que se registra…). */
  subtitle?: string
  /** A la derecha del título: la «i» (`Ayuda`) con lo que explica la hoja, en lugar de un texto suelto. */
  accion?: ReactNode
  children: ReactNode
  /** Acciones persistentes en formularios largos; fuera del scroll del contenido. */
  footer?: ReactNode
  /** Devuelve false para conservar la capa (p. ej. confirmar el descarte de un formulario). */
  onBeforeClose?: () => boolean
}

/**
 * Panel inferior modal. Se cierra con el backdrop, Escape o arrastrando el asa hacia abajo.
 * Anima entrada y salida (sin animación con prefers-reduced-motion), bloquea el scroll de la página,
 * mantiene el foco dentro y lo devuelve al elemento que lo abrió.
 * Las salidas iniciadas aquí animan antes de `onClose`; open=false también anima, desmontar directamente no.
 */
export default function Sheet({ id, open, onClose, onExited, title, subtitle, accion, children, footer, onBeforeClose }: Props) {
  const { mounted, visible, close } = useOverlayPresence(open, onClose)
  const requestClose = () => {
    if (onBeforeClose?.() === false) return false
    close()
    return true
  }
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const drag = useRef<{ startY: number; dy: number; t: number } | null>(null)

  useModalLayer(mounted, panelRef, requestClose)
  const wasMounted = useRef(false)
  useLayoutEffect(() => {
    if (mounted) { wasMounted.current = true; return }
    if (wasMounted.current) { wasMounted.current = false; onExited?.() }
  }, [mounted, onExited])

  // Arrastrar para cerrar: solo desde el asa, para no pelear con el scroll del contenido.
  const onDragStart = (e: PointerEvent) => {
    drag.current = { startY: e.clientY, dy: 0, t: Date.now() }
    e.currentTarget.setPointerCapture(e.pointerId)
    if (panelRef.current) panelRef.current.style.transition = 'none'
  }
  const onDragMove = (e: PointerEvent) => {
    const d = drag.current
    if (!d || !panelRef.current) return
    d.dy = Math.max(0, e.clientY - d.startY)
    panelRef.current.style.transform = `translateY(${d.dy}px)`
  }
  const onDragEnd = () => {
    const d = drag.current
    drag.current = null
    const el = panelRef.current
    if (!d || !el) return
    el.style.transition = ''
    const velocity = d.dy / Math.max(1, Date.now() - d.t) // px/ms
    if (d.dy > el.offsetHeight * 0.3 || (d.dy > 40 && velocity > 0.5)) {
      el.style.transform = ''
      requestClose()
    } else {
      el.style.transform = ''
    }
  }
  const cancelDrag = () => {
    drag.current = null
    if (panelRef.current) { panelRef.current.style.transition = ''; panelRef.current.style.transform = '' }
  }

  if (!mounted) return null
  return createPortal(
    <div data-visible={visible} className="sheet-layer modal-viewport safe-inline fixed inset-x-0 z-50 flex items-end justify-center">
      <div
        className={`overlay-backdrop absolute inset-0 bg-overlay/50 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={requestClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`sheet-panel safe-bottom relative flex max-h-sheet w-full max-w-lg flex-col rounded-t-sheet bg-surface-elevated shadow-overlay outline-none ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="sheet-header flex shrink-0 items-start justify-between gap-2 px-card">
          <div
            className="min-h-touch min-w-0 flex-1 cursor-grab touch-none pb-3 pt-3 active:cursor-grabbing"
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={cancelDrag}
            onLostPointerCapture={cancelDrag}
          >
            <div className="h-1 w-8 rounded-pill bg-line-strong" aria-hidden />
          </div>
          <IconButton icon="close" label="Cerrar" variant="ghost" className="mt-2" onClick={requestClose} />
        </div>
        <div className="sheet-content min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="px-card pb-card">
            {title && (accion
              ? <div className={`flex items-center justify-between gap-2 ${subtitle ? '' : 'mb-3'}`}><h2 id={titleId} className="min-w-0 break-words text-title text-fg">{title}</h2>{accion}</div>
              : <h2 id={titleId} className={`break-words text-title text-fg ${subtitle ? '' : 'mb-3'}`}>{title}</h2>)}
            {subtitle && <p className="mb-3 break-words text-body-sm text-fg-muted">{subtitle}</p>}
            {children}
          </div>
        </div>
        {footer && <footer className="shrink-0 border-t border-line px-card py-3">{footer}</footer>}
      </div>
    </div>, document.body,
  )
}
