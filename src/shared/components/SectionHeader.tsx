import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Acción a la derecha (p. ej. un IconButton «⋯»). */
  action?: ReactNode
  tone?: 'default' | 'destructive'
}

/** Título de sección: etiqueta pequeña en mayúsculas. */
export default function SectionHeader({ children, action, tone = 'default' }: Props) {
  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <h2 className={`text-label uppercase tracking-wide ${tone === 'destructive' ? 'text-destructive' : 'text-fg-subtle'}`}>{children}</h2>
      {action}
    </div>
  )
}
