import { useId, useState, type ReactNode } from 'react'
import Icon from './Icon'
interface Props {
  title: string
  children: ReactNode
  open?: boolean
  onChange?: (open: boolean) => void
  className?: string
}
/** Detalles bajo demanda; se puede controlar para abrir una guía enlazada. Tras una lista plana u otro desplegable no repite la línea, y al final de una card no la dibuja (index.css). */
export default function Disclosure({ title, children, open, onChange, className = '' }: Props) {
  const [localOpen, setLocalOpen] = useState(false)
  const expanded = open ?? localOpen
  const id = useId()
  return (
    <div className={`app-disclosure border-y border-line ${className}`}>
      <button type="button" aria-expanded={expanded} aria-controls={id}
        onClick={() => { setLocalOpen(!expanded); onChange?.(!expanded) }}
        className="flex min-h-touch w-full items-center justify-between gap-3 py-3 pr-1 text-left text-body-sm font-semibold text-fg">
        <span className="min-w-0 flex-1 break-words">{title}</span><Icon name="chevron-right" size={18} className={`shrink-0 text-fg-muted transition-transform duration-short motion-reduce:transition-none ${expanded ? 'rotate-90' : ''}`} />
      </button>
      <div id={id} hidden={!expanded} className="pb-4">{children}</div>
    </div>
  )
}
