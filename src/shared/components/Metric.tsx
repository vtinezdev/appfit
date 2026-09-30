import type { ReactNode } from 'react'
import AnimatedNumber from './AnimatedNumber'

type Size = 'hero' | 'metric' | 'title'

interface Props {
  /** Número entero animado (`animate`) o texto ya formateado con `formatInt`/`formatNumber`. */
  valor: number | string
  /** Solo con `valor` numérico: cuenta hasta él (`AnimatedNumber`, entero). */
  animate?: boolean
  unidad?: string
  /** Qué es la cifra («Proteína», «Peso máx.»). */
  label?: ReactNode
  /** Contexto pequeño debajo («de 2.200», «−0,6 kg en 7 días»). */
  caption?: ReactNode
  size?: Size
  /** `right` para cifras alineadas a la derecha de una fila. */
  align?: 'left' | 'right'
  className?: string
}

const NUM: Record<Size, string> = { hero: 'text-hero', metric: 'text-metric', title: 'text-title font-bold' }
const UNIT: Record<Size, string> = { hero: 'text-title', metric: 'text-body', title: 'text-body-sm' }

/**
 * «Cifra + unidad + etiqueta»: el patrón de datos de toda la app. La cifra manda (peso 800, tabular), la unidad y la
 * etiqueta acompañan. Hereda el color del contenedor: dentro de un hero ink se ve claro sin cambiar nada.
 */
export default function Metric({ valor, animate = false, unidad, label, caption, size = 'metric', align = 'left', className = '' }: Props) {
  return (
    <div className={`min-w-0 ${align === 'right' ? 'text-right' : ''} ${className}`}>
      {label && <p className="truncate text-label uppercase text-fg-subtle">{label}</p>}
      <p className={`flex items-baseline gap-1.5 text-fg ${align === 'right' ? 'justify-end' : ''}`}>
        {animate && typeof valor === 'number' ? <AnimatedNumber value={valor} className={NUM[size]} /> : <span className={`tabular ${NUM[size]}`}>{valor}</span>}
        {unidad && <span className={`${UNIT[size]} text-fg-muted`}>{unidad}</span>}
      </p>
      {caption && <p className="tabular text-caption text-fg-muted">{caption}</p>}
    </div>
  )
}
