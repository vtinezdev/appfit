import { useRef, type CSSProperties, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import Icon, { type IconName } from '../shared/components/Icon'
import { indicePorTecla } from '../shared/design/selection'
import { useModalLayer } from '../shared/hooks/useModalLayer'
import { useOverlayPresence } from '../shared/hooks/useOverlayPresence'
import { posicionesArco } from './arco'

export interface DestinoArco<K extends string> { key: K; label: string; icon: IconName; actual: boolean }

interface Props<K extends string> {
  open: boolean
  destinos: readonly DestinoArco<K>[]
  /** La capa empieza a cerrarse al elegir; quien la abre decide qué hacer con el destino. */
  onElegir: (key: K) => void
  onClose: () => void
}

/**
 * Media luna de secciones (ADR 043): nace del botón de navegación, de izquierda a derecha en orden de lectura y de teclado
 * (flechas, Inicio y Fin). El botón queda en su sitio para cerrarla; también la cierran tocar fuera, Escape y Atrás.
 */
export default function ArcoSecciones<K extends string>({ open, destinos, onElegir, onClose }: Props<K>) {
  const { mounted, visible, close } = useOverlayPresence(open, onClose)
  const panelRef = useRef<HTMLDivElement>(null)
  const botones = useRef<(HTMLButtonElement | null)[]>([])
  const posiciones = posicionesArco(destinos.length)

  useModalLayer(mounted, panelRef, close)

  function teclado(event: KeyboardEvent<HTMLUListElement>) {
    const indice = botones.current.findIndex((boton) => boton === event.target)
    if (indice < 0) return
    const siguiente = indicePorTecla(event.key, indice, destinos.length)
    if (siguiente === null) return
    event.preventDefault()
    botones.current[siguiente]?.focus()
  }

  if (!mounted) return null
  return createPortal(
    <div data-visible={visible} className="fixed inset-0 z-50">
      <div className={`overlay-backdrop arco-fondo absolute inset-0 ${visible ? 'opacity-100' : 'opacity-0'}`} onClick={close} aria-hidden />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label="Secciones" tabIndex={-1} className="arco-panel">
        <nav aria-label="Secciones">
          <ul className="arco-origen" onKeyDown={teclado}>
            {destinos.map((d, i) => (
              <li key={d.key} className="arco-item" style={{ '--arco-x': posiciones[i].x, '--arco-y': posiciones[i].y, '--arco-i': i } as CSSProperties}>
                <button ref={(el) => { botones.current[i] = el }} type="button" className="arco-destino app-button"
                  aria-current={d.actual ? 'page' : undefined} onClick={() => { onElegir(d.key); close() }}>
                  <span className="arco-circulo"><Icon name={d.icon} size={22} /></span>
                  <span>{d.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <button type="button" className="nav-boton app-button" aria-label="Cerrar secciones" onClick={close}>
          <Icon name="close" size={24} />
        </button>
      </div>
    </div>, document.body,
  )
}
