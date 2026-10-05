import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Acción a la derecha (p. ej. un IconButton «⋯» o un ghost «Ver todo»). */
  action?: ReactNode
  /**
   * `section`: título de sección de una pantalla (`text-title`, sin mayúsculas).
   * `label` (por defecto): etiqueta pequeña en caja normal, para sheets y resúmenes.
   */
  variant?: 'label' | 'section'
  tone?: 'default' | 'destructive'
}

export default function SectionHeader({ children, action, variant = 'label', tone = 'default' }: Props) {
  if (variant === 'section') {
    return (
      <div className="flex items-center justify-between gap-2">
        <h2 className={`text-heading ${tone === 'destructive' ? 'text-destructive' : 'text-fg'}`}>{children}</h2>
        {action}
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <h2 className={`text-label ${tone === 'destructive' ? 'text-destructive' : 'text-fg-muted'}`}>{children}</h2>
      {action}
    </div>
  )
}
