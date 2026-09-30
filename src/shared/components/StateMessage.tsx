import type { ReactNode } from 'react'
import Icon, { type IconName } from './Icon'

/** Estado de carga: una línea discreta, sin spinners a pantalla completa. */
export function LoadingState({ children = 'Cargando…' }: { children?: ReactNode }) {
  return (
    <div role="status" className="flex items-center gap-2 p-page text-body-sm text-fg-muted">
      <Icon name="loader" size={16} />
      {children}
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
      <div className="flex flex-col items-center gap-2 px-page py-section text-center">
        {icon && (
          <span className="mb-1 flex h-14 w-14 items-center justify-center rounded-pill bg-surface-muted text-fg-muted">
            <Icon name={icon} size={24} />
          </span>
        )}
        {title && <p className="text-title text-fg">{title}</p>}
        {children && <p className="max-w-xs text-body-sm text-fg-muted">{children}</p>}
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
