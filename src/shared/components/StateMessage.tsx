import type { ReactNode } from 'react'
import Icon from './Icon'

/** Estado de carga: una línea discreta, sin spinners a pantalla completa. */
export function LoadingState({ children = 'Cargando…' }: { children?: ReactNode }) {
  return (
    <div role="status" className="flex items-center gap-2 p-page text-body-sm text-fg-muted">
      <Icon name="loader" size={16} />
      {children}
    </div>
  )
}

/** Estado vacío: dice qué falta y, si procede, qué hacer. */
export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="space-y-2 px-1 py-2 text-body-sm text-fg-subtle">
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
