import type { ReactNode } from 'react'

interface Props {
  title: string
  /** Contexto debajo del título (fecha, saludo…). */
  overline?: string
  /** Acción a la derecha (IconButton, Button ghost…). */
  action?: ReactNode
}

/** Cabecera deportiva: título display y contexto. Una por pestaña. */
export default function PageHeader({ title, overline, action }: Props) {
  return (
    <header className="page-header flex min-h-touch flex-wrap items-center justify-between gap-3">
      <div className="page-header-main min-w-0 flex-1">
        <h1 className="break-words text-display text-fg">{title}</h1>
        {overline && <p className="mt-1 text-body-sm text-fg-muted first-letter:uppercase">{overline}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}
