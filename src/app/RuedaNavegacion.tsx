import { useRef, useState, type KeyboardEvent, type CSSProperties } from 'react'
import Button from '../shared/components/Button'
import Icon, { type IconName } from '../shared/components/Icon'
import { indicePorTecla } from '../shared/design/selection'
import { OPCIONES_POR_RUEDA, paginasRueda, posicionesRueda } from '../shared/design/rueda'
import { formatInt } from '../shared/lib/format'

interface Destino<T extends string> { key: T; label: string; icon: IconName }
interface Props<T extends string> {
  destinos: readonly Destino<T>[]
  actual: T
  visible?: boolean
  onElegir: (destino: T) => void
  onClose: () => void
}

/** Destinos nacidos del mismo punto, con orden de lectura y teclado estable. */
export default function RuedaNavegacion<T extends string>({ destinos, actual, visible = true, onElegir, onClose }: Props<T>) {
  const paginas = paginasRueda(destinos)
  const [pagina, setPagina] = useState(() => Math.floor(Math.max(0, destinos.findIndex((d) => d.key === actual)) / OPCIONES_POR_RUEDA))
  const paginaActual = Math.min(pagina, Math.max(0, paginas.length - 1))
  const opciones = paginas[paginaActual] ?? []
  const posiciones = posicionesRueda(opciones.length)
  const botones = useRef<(HTMLButtonElement | null)[]>([])

  function cambiarPagina(siguiente: number) {
    setPagina(siguiente)
    requestAnimationFrame(() => botones.current[0]?.focus())
  }

  function teclado(event: KeyboardEvent<HTMLUListElement>) {
    const indice = botones.current.findIndex((button) => button === event.target)
    if (indice < 0) return
    const siguiente = indicePorTecla(event.key, indice, opciones.length)
    if (siguiente === null) return
    event.preventDefault()
    botones.current[siguiente]?.focus()
  }

  return (
    <nav aria-label="Destinos de la aplicación" className="fan-menu" data-visible={visible}>
      <div className="relative">
        <ul onKeyDown={teclado}>
          {opciones.map((destino, i) => {
            const activa = destino.key === actual
            const { x, y } = posiciones[i]
            return (
              <li key={destino.key} className="fan-item" style={{ '--fan-x': `calc(var(--menu-orbit) * ${x})`, '--fan-y': `calc(var(--menu-rise) * ${y})`, '--fan-index': i } as CSSProperties}>
                <button
                  ref={(el) => { botones.current[i] = el }}
                  type="button"
                  aria-label={destino.label}
                  aria-current={activa ? 'page' : undefined}
                  onClick={() => onElegir(destino.key)}
                  className={`fan-target app-button flex w-menu-node flex-col items-center justify-center gap-1 rounded-pill px-1 ${activa ? 'bg-accent text-accent-on' : 'bg-surface-elevated text-fg hover:bg-surface-muted'}`}
                >
                  <Icon name={destino.icon} size={24} />
                  <span className="w-full break-words text-center text-caption font-semibold">{destino.label}</span>
                  {activa && <Icon name="check" size={12} className="fan-check" />}
                </button>
              </li>
            )
          })}
        </ul>
        <button type="button" aria-label="Cerrar menú" onClick={onClose}
          className="menu-trigger fan-hub app-button">
          <Icon name="close" size={20} /><span>Menú</span>
        </button>
      </div>
      {paginas.length > 1 && <div className="fan-pages flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" aria-label="Destinos anteriores" disabled={paginaActual === 0} onClick={() => cambiarPagina(paginaActual - 1)}><Icon name="chevron-left" size={18} /></Button>
        <p aria-live="polite" className="text-caption text-fg-muted">{formatInt(paginaActual + 1)} de {formatInt(paginas.length)}</p>
        <Button variant="ghost" size="sm" aria-label="Más destinos" disabled={paginaActual === paginas.length - 1} onClick={() => cambiarPagina(paginaActual + 1)}><Icon name="chevron-right" size={18} /></Button>
      </div>}
    </nav>
  )
}
