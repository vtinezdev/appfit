import { indicePorTecla } from '../design/selection'
import { useLayoutEffect, useRef, type CSSProperties, type KeyboardEvent } from 'react'
import { haptic } from '../design/motion'
interface Props<T extends string> {
  /** `descripcion` solo se muestra en la variante `vertical`. */
  opciones: { valor: T; label: string; descripcion?: string }[]
  /** `null`: todavía no hay selección (ningún segmento marcado; el primero entra en el orden de tabulación). */
  valor: T | null
  onChange: (valor: T) => void
  className?: string
  label?: string
  size?: 'md' | 'sm'
  /** `vertical`: una opción por fila con descripción (listas cortas de opciones largas, p. ej. el nivel de actividad). */
  variante?: 'horizontal' | 'vertical'
}
/** Selector de un valor. Para navegación entre vistas se usa ViewTabs. */
export default function SegmentedControl<T extends string>({ opciones, valor, onChange, className = '', label = 'Elegir opción', size = 'md', variante = 'horizontal' }: Props<T>) {
  const vertical = variante === 'vertical'
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
    if (vertical) return
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    buttons.forEach(button => observer.observe(button))
    return () => observer.disconnect()
  }, [valor, optionKey, vertical])
  const teclado = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const next = indicePorTecla(e.key, i, opciones.length)
    if (next === null) return
    e.preventDefault()
    elegir(opciones[next].valor)
    e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus()
  }
  if (vertical) return (
    <div ref={root} role="radiogroup" aria-label={label} className={`flex min-w-0 flex-col gap-2 ${className}`}>
      {opciones.map((o, i) => (
        <button key={o.valor} type="button" role="radio" aria-checked={valor === o.valor} tabIndex={valor === o.valor || (valor === null && i === 0) ? 0 : -1}
          onClick={() => elegir(o.valor)} onKeyDown={(e) => teclado(e, i)}
          className={`min-h-touch w-full min-w-0 rounded-md border px-3 py-2.5 text-left transition-colors duration-short ${valor === o.valor ? 'border-accent bg-selected text-selected-on' : 'border-line-strong bg-surface-muted text-fg hover:bg-line'}`}>
          <span className="block break-words text-body-sm font-semibold">{o.label}</span>
          {o.descripcion && <span className={`mt-0.5 block break-words text-caption ${valor === o.valor ? 'text-selected-on' : 'text-fg-muted'}`}>{o.descripcion}</span>}
        </button>
      ))}
    </div>
  )
  return (
    <div ref={root} role="radiogroup" aria-label={label} className={`app-segmented relative flex min-w-0 gap-1 rounded-pill bg-surface-muted p-1 ${className}`}
      style={{ '--selection-index': opciones.findIndex(o => o.valor === valor), '--selection-count': opciones.length } as CSSProperties}>
      <span aria-hidden className="segment-indicator" style={valor === null ? { opacity: 0 } : undefined} />
      {opciones.map((o, i) => (
        <button key={o.valor} type="button" role="radio" aria-checked={valor === o.valor} tabIndex={valor === o.valor || (valor === null && i === 0) ? 0 : -1}
          onClick={() => elegir(o.valor)}
          onKeyDown={(e) => teclado(e, i)}
          className={`relative min-h-touch min-w-0 flex-auto rounded-pill px-1 font-semibold transition-colors duration-short ${size === 'sm' ? 'text-body-sm' : 'text-body-sm'} ${valor === o.valor ? 'text-selected-on' : 'text-fg-muted hover:text-fg'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
