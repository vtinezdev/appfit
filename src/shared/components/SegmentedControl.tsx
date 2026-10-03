import { indicePorTecla } from '../design/selection'
import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import { haptic } from '../design/motion'
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
  const elegir = (next: T) => { if (next !== valor) haptic(); onChange(next) }
  const root = useRef<HTMLDivElement>(null)
  const optionKey = opciones.map(o => `${o.valor}:${o.label}`).join('|')
  useLayoutEffect(() => {
    const element = root.current
    if (!element) return
    const buttons = Array.from(element.querySelectorAll<HTMLButtonElement>('button'))
    const measure = () => {
      const selected = element.querySelector<HTMLButtonElement>('[aria-checked="true"]')
      if (!selected || !element.getClientRects().length) return
      element.style.setProperty('--selection-width', `${selected.offsetWidth}px`)
      element.style.setProperty('--selection-offset', `${selected.offsetLeft - 4}px`)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    buttons.forEach(button => observer.observe(button))
    return () => observer.disconnect()
  }, [valor, optionKey])
  return (
    <div ref={root} role="radiogroup" aria-label={label} className={`app-segmented relative flex min-w-0 gap-1 rounded-md bg-surface-muted p-1 ${className}`}
      style={{ '--selection-index': opciones.findIndex(o => o.valor === valor), '--selection-count': opciones.length } as CSSProperties}>
      <span aria-hidden className="segment-indicator" />
      {opciones.map((o, i) => (
        <button key={o.valor} type="button" role="radio" aria-checked={valor === o.valor} tabIndex={valor === o.valor ? 0 : -1}
          onClick={() => elegir(o.valor)}
          onKeyDown={(e) => {
            const next = indicePorTecla(e.key, i, opciones.length)
            if (next === null) return
            e.preventDefault()
            elegir(opciones[next].valor)
            e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus()
          }}
          className={`relative min-h-touch min-w-0 flex-auto rounded-sm px-1 font-semibold transition-colors duration-short ${size === 'sm' ? 'text-body-sm' : 'text-body-sm'} ${valor === o.valor ? 'text-selected-on' : 'text-fg-muted hover:text-fg'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
