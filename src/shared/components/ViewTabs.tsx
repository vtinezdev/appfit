import { useId, type CSSProperties, type ReactNode } from 'react'
import { indicePorTecla } from '../design/selection'
import { haptic } from '../design/motion'
interface Props<T extends string> {
  opciones: { valor: T; label: string }[]
  valor: T
  onChange: (valor: T) => void
  label: string
  children: ReactNode
}
/** Pestañas planas de navegación, con panel asociado y teclado completo. */
export default function ViewTabs<T extends string>({ opciones, valor, onChange, label, children }: Props<T>) {
  const id = useId()
  const elegir = (next: T) => { if (next !== valor) haptic(); onChange(next) }
  return (
    <div>
      <div role="tablist" aria-label={label} className="app-tabs relative flex border-b border-line"
        style={{ '--selection-index': opciones.findIndex(o => o.valor === valor), '--selection-count': opciones.length } as CSSProperties}>
        <span className="tab-indicator" aria-hidden />
        {opciones.map((o, i) => (
          <button key={o.valor} type="button" id={`${id}-${o.valor}`} role="tab" aria-selected={valor === o.valor}
            aria-controls={`${id}-panel`} tabIndex={valor === o.valor ? 0 : -1} onClick={() => elegir(o.valor)}
            onKeyDown={(e) => {
              const next = indicePorTecla(e.key, i, opciones.length)
              if (next === null) return
              e.preventDefault()
              elegir(opciones[next].valor)
              e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus()
            }}
            className={`relative min-h-touch min-w-0 flex-1 px-1 text-body-sm font-semibold transition-colors duration-short ${valor === o.valor ? 'text-fg' : 'text-fg-muted hover:text-fg'}`}>
            {o.label}
          </button>
        ))}
      </div>
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${valor}`} tabIndex={0} className="pt-4"><div key={valor} className="view-arrival">{children}</div></div>
    </div>
  )
}
