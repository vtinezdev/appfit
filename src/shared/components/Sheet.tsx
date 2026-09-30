import { useCallback, useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { motionMs } from '../design/motion'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

// Sheets abiertos, el último es el de arriba: solo él atiende Escape y captura el foco.
const stack: symbol[] = []
let scrollLocks = 0

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Panel inferior modal. Se cierra con el backdrop, Escape o arrastrando el asa/cabecera hacia abajo.
 * Anima entrada y salida (sin animación con prefers-reduced-motion), bloquea el scroll de la página,
 * mantiene el foco dentro y lo devuelve al elemento que lo abrió.
 * Las salidas iniciadas aquí animan antes de llamar a `onClose`; si el padre lo desmonta o pone open=false por su cuenta, se retira sin animar salida (open=false sí la anima).
 */
export default function Sheet({ open, onClose, title, children }: Props) {
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const idRef = useRef(Symbol('sheet'))
  const titleId = useId()
  const onCloseRef = useRef(onClose)
  const closingRef = useRef(false)
  // Elemento que abrió el sheet. Se captura al renderizar (antes de que un `autoFocus` de dentro le robe el foco).
  const triggerRef = useRef<HTMLElement | null>(null)
  if (open && triggerRef.current === null) triggerRef.current = document.activeElement as HTMLElement | null
  const drag = useRef<{ startY: number; dy: number; t: number } | null>(null)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  // Montaje / desmontaje con animación
  useEffect(() => {
    if (open) {
      closingRef.current = false
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true)
      // un instante después del montaje para que la transición de entrada parta del estado oculto
      const t = setTimeout(() => setVisible(true), 20)
      return () => clearTimeout(t)
    }
    setVisible(false)
    const t = setTimeout(() => setMounted(false), motionMs('--dur-normal'))
    return () => clearTimeout(t)
  }, [open])

  const requestClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setVisible(false)
    setTimeout(() => onCloseRef.current(), motionMs('--dur-normal'))
  }, [])

  // Escape, scroll lock y foco
  useEffect(() => {
    if (!mounted) return
    const id = idRef.current
    stack.push(id)
    if (scrollLocks++ === 0) document.body.style.overflow = 'hidden'
    const panel = panelRef.current
    // (StrictMode monta/desmonta/monta en desarrollo: tras el primer desmontaje el foco vuelve al trigger y se recaptura aquí)
    triggerRef.current ??= document.activeElement as HTMLElement | null
    // Si algo de dentro ya tomó el foco (autoFocus), se respeta; si no, va al panel.
    if (panel && !panel.contains(document.activeElement)) panel.focus()

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return
      if (e.key === 'Escape') {
        e.stopPropagation()
        requestClose()
      } else if (e.key === 'Tab' && panelRef.current) {
        const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
        if (items.length === 0) {
          e.preventDefault()
          return
        }
        const first = items[0]
        const last = items[items.length - 1]
        const active = document.activeElement
        if (e.shiftKey && (active === first || active === panelRef.current)) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      stack.splice(stack.indexOf(id), 1)
      if (--scrollLocks === 0) document.body.style.overflow = ''
      const trigger = triggerRef.current
      triggerRef.current = null
      if (trigger?.isConnected) trigger.focus()
    }
  }, [mounted, requestClose])

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

  if (!mounted) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className={`absolute inset-0 bg-overlay/50 transition-opacity duration-normal ease-standard ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={requestClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`safe-bottom relative flex max-h-sheet w-full max-w-lg flex-col rounded-t-lg bg-surface-elevated shadow-overlay outline-none transition-transform duration-normal ease-standard ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div
          className="shrink-0 cursor-grab touch-none px-card pb-2 pt-3 active:cursor-grabbing"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <div className="mx-auto h-1 w-9 rounded-pill bg-line-strong" aria-hidden />
          {title && (
            <h2 id={titleId} className="mt-3 text-heading text-fg">
              {title}
            </h2>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-card pb-card">{children}</div>
      </div>
    </div>
  )
}
