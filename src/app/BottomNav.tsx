import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../shared/components/Icon'
import RuedaNavegacion from './RuedaNavegacion'
import { useModalLayer } from '../shared/hooks/useModalLayer'
import { useOverlayPresence } from '../shared/hooks/useOverlayPresence'
import { haptic } from '../shared/design/motion'
import { DESTINOS, type Tab } from './navegacion'
export type { Tab } from './navegacion'

interface Props {
  tab: Tab
  onChange: (tab: Tab) => void
}

/** El origen medido del botón se conserva durante toda la expansión y su reversa. */
export default function BottomNav({ tab, onChange }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [origen, setOrigen] = useState({ x: 0, y: 0 })
  const [compacto, setCompacto] = useState(false)
  const elegido = useRef<Tab | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const { mounted, visible, close } = useOverlayPresence(abierto, () => {
    setAbierto(false)
    if (elegido.current) onChange(elegido.current)
    elegido.current = null
  })
  useModalLayer(mounted, panel, close)
  const menuId = useId()
  const contextoId = useId()
  const actual = DESTINOS.find((destino) => destino.key === tab)!

  useEffect(() => {
    if (!abierto) return
    const medir = () => {
      const rect = trigger.current?.getBoundingClientRect()
      if (rect) setOrigen({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
      setCompacto(parseFloat(getComputedStyle(document.documentElement).fontSize) > 20 || innerHeight < 360)
    }
    medir()
    window.addEventListener('resize', medir)
    window.visualViewport?.addEventListener('resize', medir)
    return () => {
      window.removeEventListener('resize', medir)
      window.visualViewport?.removeEventListener('resize', medir)
    }
  }, [abierto])

  function cerrar() { haptic(); close() }
  return (
    <nav aria-label="Navegación principal" className="app-nav safe-bottom z-40 shrink-0 bg-bg">
      <div className="nav-content relative mx-auto flex h-nav max-w-lg items-center justify-center px-page">
        <span id={contextoId} className="nav-context flex items-center gap-1.5 text-caption font-semibold">
          <Icon name={actual.icon} size={16} /><span className="sr-only">Sección actual: </span><span className="min-w-0 break-words">{actual.label}</span>
        </span>
        <button ref={trigger} type="button" className="menu-trigger app-button" aria-label="Menú" aria-haspopup="dialog"
          aria-expanded={abierto} aria-controls={menuId} aria-describedby={contextoId} data-nav-trigger
          onClick={() => { haptic(); elegido.current = null; setAbierto(true) }}>
          <Icon name="menu" size={20} />Menú
        </button>
      </div>
      {mounted && createPortal(<div className="fan-layer fixed inset-0 z-50" data-visible={visible}>
        <div className="overlay-backdrop absolute inset-0 bg-overlay/50" onClick={cerrar} aria-hidden />
        <div ref={panel} id={menuId} role="dialog" aria-label="Menú" aria-modal="true" tabIndex={-1}
          className="fan-dialog outline-none" data-compact={compacto}
          style={{ '--menu-origin-x': `${origen.x}px`, '--menu-origin-y': `${origen.y}px` } as CSSProperties}>
          <RuedaNavegacion destinos={DESTINOS} actual={tab} visible={visible} onClose={cerrar}
            onElegir={(destino) => { elegido.current = destino; cerrar() }} />
        </div>
      </div>, document.body)}
    </nav>
  )
}
