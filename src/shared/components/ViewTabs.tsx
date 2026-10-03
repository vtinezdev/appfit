import { useId, type ReactNode } from 'react'
import { indicePorTecla } from '../design/selection'
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
  return (
    <div>
      <div role="tablist" aria-label={label} className="flex border-b border-line">
        {opciones.map((o, i) => (
          <button key={o.valor} type="button" id={`${id}-${o.valor}`} role="tab" aria-selected={valor === o.valor}
            aria-controls={`${id}-panel`} tabIndex={valor === o.valor ? 0 : -1} onClick={() => onChange(o.valor)}
            onKeyDown={(e) => {
              const next = indicePorTecla(e.key, i, opciones.length)
              if (next === null) return
              e.preventDefault()
              onChange(opciones[next].valor)
              e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus()
            }}
            className={`min-h-touch min-w-0 flex-1 border-b-2 px-1 text-body-sm font-semibold transition-colors duration-short ${valor === o.valor ? 'border-accent text-fg' : 'border-transparent text-fg-muted hover:text-fg'}`}>
            {o.label}
          </button>
        ))}
      </div>
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${valor}`} tabIndex={0} className="pt-5">{children}</div>
    </div>
  )
}
