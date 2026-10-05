import type { ReactNode } from 'react'
import Icon, { type IconName } from './Icon'

/** Estado de carga: una línea discreta, sin spinners a pantalla completa. */
export function LoadingState({ children = 'Cargando…' }: { children?: ReactNode }) {
  return (
    <div role="status" className="space-y-3 py-4 text-body-sm text-fg-muted">
      <span>{children}</span>
      <div aria-hidden className="loading-skeleton space-y-2"><div className="h-3 w-2/3 rounded-sm bg-surface-muted" /><div className="h-3 w-full rounded-sm bg-surface-muted" /><div className="h-3 w-1/2 rounded-sm bg-surface-muted" /></div>
    </div>
  )
}

interface EmptyProps {
  children?: ReactNode
  action?: ReactNode
  /** Con `icon` o `title` el estado se centra (pantalla vacía); sin ellos es la línea compacta de una lista. */
  icon?: IconName
  title?: string
}

/** Estado vacío: dice qué falta y, si procede, qué hacer. */
export function EmptyState({ children, action, icon, title }: EmptyProps) {
  if (icon || title) {
    return (
      <div className="flex flex-col items-start gap-3 border-y border-line py-section">
        {icon && <Icon name={icon} size={26} className="text-fg-muted" />}
        {title && <p className="text-heading text-fg">{title}</p>}
        {children && <p className="max-w-sm text-body-sm text-fg-muted">{children}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    )
  }
  return (
    <div className="space-y-2 px-1 py-2 text-body-sm text-fg-muted">
      <p>{children}</p>
      {action}
    </div>
  )
}

/** Error recuperable: explica qué hacer; el color es de aviso, sin tono alarmista. */
export function ErrorState({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-2 text-body-sm text-destructive">
      <Icon name="alert" size={18} className="mt-0.5" />
      <span className="min-w-0">{children}</span>
    </p>
  )
}
