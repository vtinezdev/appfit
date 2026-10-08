import type { ButtonHTMLAttributes } from 'react'
import Icon from '../../../shared/components/Icon'

/** Una tarea y su estado; misma fila para los ajustes del ejercicio y de la serie. */
export default function OpcionEjercicio({ titulo, detalle, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { titulo: string; detalle: string }) {
  return <button type="button" {...props} className="app-button flex min-h-touch w-full items-center justify-between gap-3 rounded-md py-3 text-left hover:bg-surface-muted disabled:opacity-40">
    <span className="min-w-0 space-y-1"><span className="block text-body-sm font-semibold text-fg">{titulo}</span><span className="block break-words text-caption text-fg-muted">{detalle}</span></span>
    <Icon name="chevron-right" size={18} className="shrink-0 text-fg-muted" />
  </button>
}
