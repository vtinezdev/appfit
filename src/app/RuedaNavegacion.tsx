import { useRef, useState, type KeyboardEvent } from 'react'
import Button from '../shared/components/Button'
import Icon, { type IconName } from '../shared/components/Icon'
import { indicePorTecla } from '../shared/design/selection'
import { OPCIONES_POR_RUEDA, paginasRueda, posicionesRueda } from '../shared/design/rueda'
import { formatInt } from '../shared/lib/format'

interface Destino<T extends string> { key: T; label: string; icon: IconName }
interface Props<T extends string> {
  destinos: readonly Destino<T>[]
  actual: T
  onElegir: (destino: T) => void
  onClose: () => void
}

/** Contenido de Sheet: navegación circular etiquetada, sin gestionar otra capa modal. */
export default function RuedaNavegacion<T extends string>({ destinos, actual, onElegir, onClose }: Props<T>) {
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
    <nav aria-label="Destinos de la aplicación" className="space-y-3">
      <div className="relative mx-auto h-menu-wheel w-menu-wheel max-w-full">
        <div aria-hidden className="pointer-events-none absolute inset-10 rounded-pill border border-line" />
        <ul onKeyDown={teclado}>
          {opciones.map((destino, i) => {
            const activa = destino.key === actual
            const { x, y } = posiciones[i]
            return (
              <li key={destino.key}>
                <button
                  ref={(el) => { botones.current[i] = el }}
                  type="button"
                  aria-label={destino.label}
                  aria-current={activa ? 'page' : undefined}
                  onClick={() => onElegir(destino.key)}
                  style={{ left: `calc(50% + var(--menu-orbit) * ${x})`, top: `calc(50% + var(--menu-orbit) * ${y})` }}
                  className={`absolute flex h-menu-item w-menu-item -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-pill border p-2 transition-colors duration-short ${activa ? 'border-accent-strong bg-accent-subtle text-accent-strong' : 'border-line bg-surface text-fg hover:bg-surface-muted active:bg-surface-muted'}`}
                >
                  <Icon name={destino.icon} size={24} />
                  <span className="w-full break-words text-center text-caption font-semibold">{destino.label}</span>
                  {activa && <Icon name="check" size={12} className="absolute right-2 top-2" />}
                </button>
              </li>
            )
          })}
        </ul>
        <button type="button" aria-label="Cerrar menú" onClick={onClose}
          className="absolute left-1/2 top-1/2 flex h-menu-hub w-menu-hub -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-pill bg-accent text-accent-on transition-opacity duration-short active:opacity-80">
          <Icon name="close" size={22} />
          <span className="text-caption font-semibold">Cerrar</span>
        </button>
      </div>
      {paginas.length > 1 && <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" aria-label="Destinos anteriores" disabled={paginaActual === 0} onClick={() => cambiarPagina(paginaActual - 1)}><Icon name="chevron-left" size={18} /></Button>
        <p aria-live="polite" className="text-caption text-fg-muted">{formatInt(paginaActual + 1)} de {formatInt(paginas.length)}</p>
        <Button variant="ghost" size="sm" aria-label="Más destinos" disabled={paginaActual === paginas.length - 1} onClick={() => cambiarPagina(paginaActual + 1)}><Icon name="chevron-right" size={18} /></Button>
      </div>}
    </nav>
  )
}
