import { useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useModalLayer } from '../hooks/useModalLayer'
import { useOverlayPresence } from '../hooks/useOverlayPresence'
import Button from './Button'
import Icon from './Icon'
interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  closeLabel?: string
}
/** Tarea a pantalla completa, con contenido desplazable y acción final fuera del scroll. */
export default function ModalPage({ title, onClose, children, footer, closeLabel = 'Volver' }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const { mounted, visible, close } = useOverlayPresence(true, onClose)
  useModalLayer(mounted, panelRef, close)
  if (!mounted) return null
  return createPortal(
    <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
      data-visible={visible} className="task-layer modal-viewport fixed inset-x-0 z-50 flex flex-col bg-bg outline-none">
      <header className="safe-top shrink-0 border-b border-line bg-bg">
        <div className="mx-auto flex w-full max-w-lg items-center gap-3 px-page py-2">
          <Button variant="ghost" size="sm" className="-ml-3" onClick={close}><Icon name="arrow-left" size={18} />{closeLabel}</Button>
          <h1 id={titleId} className="min-w-0 flex-1 text-title text-fg">{title}</h1>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-lg px-page py-5">{children}</div>
      </div>
      {footer && <footer className="safe-bottom shrink-0 border-t border-line bg-surface"><div className="mx-auto w-full max-w-lg px-page py-3">{footer}</div></footer>}
    </div>, document.body,
  )
}
