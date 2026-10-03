import type { ReactNode } from 'react'
import { formatInt } from '../lib/format'

type Size = 'hero' | 'metric' | 'title'
interface Props {
  valor: number | string
  unidad?: string
  label?: ReactNode
  caption?: ReactNode
  size?: Size
  align?: 'left' | 'right'
  className?: string
}
const NUM: Record<Size, string> = { hero: 'text-hero', metric: 'text-metric', title: 'text-title font-bold' }
const UNIT: Record<Size, string> = { hero: 'text-body', metric: 'text-body-sm', title: 'text-caption' }
/** Métrica honesta: valor final inmediato, unidades visibles, contenido largo adaptable. */
export default function Metric({ valor, unidad, label, caption, size = 'metric', align = 'left', className = '' }: Props) {
  return (
    <div className={`min-w-0 ${align === 'right' ? 'text-right' : ''} ${className}`}>
      {label && <p className="mb-1 text-label text-fg-muted">{label}</p>}
      <p className={`flex flex-wrap items-baseline gap-x-1.5 text-fg ${align === 'right' ? 'justify-end' : ''}`}>
        <span className={`tabular min-w-0 break-words ${NUM[size]}`}>{typeof valor === 'number' ? formatInt(valor) : valor}</span>
        {unidad && <span className={`${UNIT[size]} text-fg-muted`}>{unidad}</span>}
      </p>
      {caption && <p className="tabular mt-1 text-caption text-fg-muted">{caption}</p>}
    </div>
  )
}
