import type { ReactNode } from 'react'

interface Props {
  title: string
  /** Contexto encima del título (fecha, saludo…). */
  overline?: string
  /** Acción a la derecha (IconButton, Button ghost…). */
  action?: ReactNode
}

/** Cabecera de pantalla: overline discreto + título `display`. Una por pestaña (Inicio, Nutrición, Entreno, Ajustes). */
export default function PageHeader({ title, overline, action }: Props) {
  return (
    <header className="flex min-h-touch items-center justify-between gap-3">
      <div className="min-w-0">
        {overline && <p className="mb-1 text-label text-fg-muted first-letter:uppercase">{overline}</p>}
        <h1 className="text-display text-fg">{title}</h1>
      </div>
      {action}
    </header>
  )
}
