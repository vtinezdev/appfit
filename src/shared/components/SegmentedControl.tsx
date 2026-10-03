import { indicePorTecla } from '../design/selection'
interface Props<T extends string> {
  opciones: { valor: T; label: string }[]
  valor: T
  onChange: (valor: T) => void
  className?: string
  label?: string
  size?: 'md' | 'sm'
}
/** Selector de un valor. Para navegación entre vistas se usa ViewTabs. */
export default function SegmentedControl<T extends string>({ opciones, valor, onChange, className = '', label = 'Elegir opción', size = 'md' }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={`flex min-w-0 gap-1 rounded-md bg-surface-muted p-1 ${className}`}>
      {opciones.map((o, i) => (
        <button key={o.valor} type="button" role="radio" aria-checked={valor === o.valor} tabIndex={valor === o.valor ? 0 : -1}
          onClick={() => onChange(o.valor)}
          onKeyDown={(e) => {
            const next = indicePorTecla(e.key, i, opciones.length)
            if (next === null) return
            e.preventDefault()
            onChange(opciones[next].valor)
            e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus()
          }}
          className={`min-h-touch min-w-0 flex-auto rounded-sm px-1 font-semibold transition-colors duration-short ${size === 'sm' ? 'text-label' : 'text-body-sm'} ${valor === o.valor ? 'bg-selected text-selected-on' : 'text-fg-muted hover:text-fg'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
