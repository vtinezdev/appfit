import { useId, useRef, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useModalLayer } from '../hooks/useModalLayer'
import { useOverlayPresence } from '../hooks/useOverlayPresence'
import { IconButton } from './Button'

interface Props {
  /** Identidad del panel cuando un control externo usa aria-controls. */
  id?: string
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** Acciones persistentes en formularios largos; fuera del scroll del contenido. */
  footer?: ReactNode
}

/**
 * Panel inferior modal. Se cierra con el backdrop, Escape o arrastrando el asa/cabecera hacia abajo.
 * Anima entrada y salida (sin animación con prefers-reduced-motion), bloquea el scroll de la página,
 * mantiene el foco dentro y lo devuelve al elemento que lo abrió.
 * Las salidas iniciadas aquí animan antes de `onClose`; open=false también anima, desmontar directamente no.
 */
export default function Sheet({ id, open, onClose, title, children, footer }: Props) {
  const { mounted, visible, close: requestClose } = useOverlayPresence(open, onClose)
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const drag = useRef<{ startY: number; dy: number; t: number } | null>(null)

  useModalLayer(mounted, panelRef, requestClose)

  // Arrastrar para cerrar: solo desde el asa y el título, para no pelear con el scroll del contenido.
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
    <div data-visible={visible} className="sheet-layer modal-viewport fixed inset-x-0 z-50 flex items-end justify-center">
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
        <div className="flex shrink-0 items-start justify-between gap-2 px-card">
          <div
            className="min-w-0 flex-1 cursor-grab touch-none pb-3 pt-3 active:cursor-grabbing"
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={cancelDrag}
            onLostPointerCapture={cancelDrag}
          >
            <div className="h-1 w-8 rounded-pill bg-line-strong" aria-hidden />
            {title && <h2 id={titleId} className="mt-3 break-words text-title text-fg">{title}</h2>}
          </div>
          <IconButton icon="close" label="Cerrar" variant="ghost" className="mt-2" onClick={requestClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-card pb-card">{children}</div>
        {footer && <footer className="shrink-0 border-t border-line px-card py-3">{footer}</footer>}
      </div>
    </div>, document.body,
  )
}
