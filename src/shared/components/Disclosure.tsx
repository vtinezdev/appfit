import { useId, useState, type ReactNode } from 'react'
import Icon from './Icon'
interface Props {
  title: string
  children: ReactNode
  open?: boolean
  onChange?: (open: boolean) => void
  className?: string
}
/** Detalles bajo demanda; se puede controlar para abrir una guía enlazada. */
export default function Disclosure({ title, children, open, onChange, className = '' }: Props) {
  const [localOpen, setLocalOpen] = useState(false)
  const expanded = open ?? localOpen
  const id = useId()
  return (
    <div className={`border-y border-line ${className}`}>
      <button type="button" aria-expanded={expanded} aria-controls={id}
        onClick={() => { setLocalOpen(!expanded); onChange?.(!expanded) }}
        className="flex min-h-touch w-full items-center justify-between gap-3 py-3 text-left text-body-sm font-semibold text-fg">
        {title}<Icon name="chevron-right" size={18} className={`text-fg-muted transition-transform duration-short ${expanded ? 'rotate-90' : ''}`} />
      </button>
      <div id={id} hidden={!expanded} className="pb-4">{children}</div>
    </div>
  )
}
