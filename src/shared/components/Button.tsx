import type { ButtonHTMLAttributes, ReactNode } from 'react'
import Icon, { type IconName } from './Icon'

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'danger' | 'contrast'
type Size = 'sm' | 'md' | 'lg'

/**
 * Naranja = acción principal; negro (`contrast`) = acción de estructura (p. ej. «Terminar»); gris = secundaria.
 * `hover:` solo actúa con puntero fino (tailwind `hoverOnlyWhenSupported`): en iOS no se queda pegado.
 */
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-on hover:brightness-95',
  secondary: 'bg-surface-muted text-fg hover:bg-line',
  ghost: 'text-accent-strong hover:bg-accent-subtle',
  destructive: 'bg-surface-muted text-destructive hover:bg-line', // acción destructiva ofrecida
  danger: 'bg-destructive text-destructive-on hover:brightness-95', // confirmación de una acción destructiva
  contrast: 'bg-selected text-selected-on hover:opacity-90',
}

const SIZES: Record<Size, string> = {
  sm: 'min-h-touch px-4 text-body-sm font-semibold', // acciones secundarias dentro de una lista; la zona táctil sigue en 44 px
  md: 'min-h-touch px-5 text-body font-semibold',
  lg: 'min-h-touch-lg px-6 text-body font-bold',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  /** Ocupa todo el ancho disponible (dentro de una fila usa `className="flex-1"`). */
  block?: boolean
  /** Acción en curso: muestra un spinner, deshabilita el botón y marca `aria-busy`. */
  loading?: boolean
  children: ReactNode
}

/** Todos los botones son pill. */
export default function Button({ variant = 'primary', size = 'md', block = false, loading = false, className = '', type = 'button', disabled, children, ...rest }: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-pill transition-[opacity,transform,background-color,filter] duration-short enabled:active:scale-95 ${loading ? 'opacity-70' : 'disabled:opacity-40'} ${VARIANTS[variant]} ${SIZES[size]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading && <Icon name="loader" size={18} />}
      {children}
    </button>
  )
}

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  icon: IconName
  /** Obligatorio: es el nombre accesible y el tooltip. */
  label: string
  variant?: 'secondary' | 'primary' | 'ghost' | 'contrast'
  /** `sm` 36 px (filas densas con separación alrededor), `md` 44 px, `lg` 56 px (acción flotante). */
  size?: 'sm' | 'md' | 'lg'
}

// `sm` mide 36 px pero amplía su zona pulsable a 44 px con un pseudo-elemento invisible (before:-inset-1).
const ICON_BOX = { sm: 'relative h-9 w-9 before:absolute before:-inset-1', md: 'h-touch w-touch', lg: 'h-14 w-14' }
const ICON_SIZE = { sm: 18, md: 20, lg: 26 }

/** Botón solo-icono. */
export function IconButton({ icon, label, variant = 'secondary', size = 'md', className = '', type = 'button', ...rest }: IconButtonProps) {
  const v = variant === 'ghost' ? 'text-fg-muted hover:bg-surface-muted hover:text-fg' : VARIANTS[variant]
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center justify-center rounded-pill transition-[opacity,transform,background-color,filter] duration-short enabled:active:scale-90 disabled:opacity-30 ${ICON_BOX[size]} ${v} ${className}`}
      {...rest}
    >
      <Icon name={icon} size={ICON_SIZE[size]} />
    </button>
  )
}
