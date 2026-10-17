import { useId, useLayoutEffect, useRef, type ReactNode } from 'react'
import { indicePorTecla } from '../design/selection'
import { haptic } from '../design/motion'
interface Props<T extends string> {
  opciones: { valor: T; label: string }[]
  valor: T
  onChange: (valor: T) => void
  label: string
  /** `principal`: las secciones de arriba de un destino (Entreno, Nutrición), recuadradas y con más cuerpo que las vistas de dentro. */
  nivel?: 'principal' | 'secundario'
  children: ReactNode
}
/** Pestañas de navegación, con panel asociado y teclado completo. */
export default function ViewTabs<T extends string>({ opciones, valor, onChange, label, nivel = 'secundario', children }: Props<T>) {
  const principal = nivel === 'principal'
  const id = useId()
  const lista = useRef<HTMLDivElement>(null)
  const clave = opciones.map(o => `${o.valor}:${o.label}`).join('|')
  useLayoutEffect(() => {
    const element = lista.current
    if (!element) return
    const medir = () => {
      const selected = element.querySelector<HTMLButtonElement>('[aria-selected="true"]')
      if (!selected) return
      element.style.setProperty('--selection-width', `${selected.offsetWidth}px`)
      element.style.setProperty('--selection-offset', `${selected.offsetLeft}px`)
      if (selected.offsetLeft < element.scrollLeft) element.scrollLeft = selected.offsetLeft
      else if (selected.offsetLeft + selected.offsetWidth > element.scrollLeft + element.clientWidth) element.scrollLeft = selected.offsetLeft + selected.offsetWidth - element.clientWidth
    }
    medir()
    const observer = new ResizeObserver(medir)
    observer.observe(element)
    element.querySelectorAll('button').forEach(button => observer.observe(button))
    return () => observer.disconnect()
  }, [valor, clave])
  const elegir = (next: T) => { if (next !== valor) haptic(); onChange(next) }
  return (
    <div>
      <div ref={lista} role="tablist" aria-label={label} className={`app-tabs relative flex ${principal ? 'app-tabs-principal rounded-md border border-line bg-surface p-1' : ''}`}>
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
            className={`app-tab relative min-h-touch flex-1 px-2 font-semibold transition-colors duration-short ${principal ? 'rounded-sm text-body' : 'text-body-sm'} ${valor === o.valor ? 'font-bold text-fg' : 'text-fg-muted hover:text-fg'}`}>
            {o.label}
          </button>
        ))}
      </div>
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${valor}`} tabIndex={0} className="pt-4"><div key={valor} className="view-arrival">{children}</div></div>
    </div>
  )
}
