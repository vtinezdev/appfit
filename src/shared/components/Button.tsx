import type { ButtonHTMLAttributes, ReactNode } from 'react'
import Icon, { type IconName } from './Icon'

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-on',
  secondary: 'bg-surface-muted text-fg',
  ghost: 'text-accent',
  destructive: 'bg-surface-muted text-destructive', // acción destructiva ofrecida
  danger: 'bg-destructive text-accent-on', // confirmación de una acción destructiva
}

const SIZES: Record<Size, string> = {
  sm: 'min-h-touch px-3 text-body-sm font-medium', // acciones secundarias dentro de una lista; la zona táctil sigue en 44 px
  md: 'min-h-touch px-4 text-body font-medium',
  lg: 'min-h-touch-lg px-5 text-body font-semibold',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  /** Ocupa todo el ancho disponible (dentro de una fila usa `className="flex-1"`). */
  block?: boolean
  /** `pill` para la acción flotante principal de una pantalla (icono + texto). */
  shape?: 'default' | 'pill'
  children: ReactNode
}

export default function Button({ variant = 'primary', size = 'md', block = false, shape = 'default', className = '', type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 ${shape === 'pill' ? 'rounded-pill enabled:active:scale-95' : 'rounded-md'} transition-[opacity,transform] duration-short active:opacity-80 disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    />
  )
}

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  icon: IconName
  /** Obligatorio: es el nombre accesible y el tooltip. */
  label: string
  variant?: 'secondary' | 'primary' | 'ghost'
  /** `sm` 36 px (filas densas con separación alrededor), `md` 44 px, `lg` 56 px (acción flotante). */
  size?: 'sm' | 'md' | 'lg'
}

// `sm` mide 36 px pero amplía su zona pulsable a 44 px con un pseudo-elemento invisible (before:-inset-1).
const ICON_BOX = { sm: 'relative h-9 w-9 before:absolute before:-inset-1', md: 'h-touch w-touch', lg: 'h-14 w-14' }
const ICON_SIZE = { sm: 18, md: 20, lg: 26 }

/** Botón solo-icono. */
export function IconButton({ icon, label, variant = 'secondary', size = 'md', className = '', type = 'button', ...rest }: IconButtonProps) {
  const v = variant === 'ghost' ? 'text-fg-muted' : VARIANTS[variant]
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center justify-center rounded-pill transition-opacity duration-short active:opacity-80 disabled:opacity-30 ${ICON_BOX[size]} ${v} ${className}`}
      {...rest}
    >
      <Icon name={icon} size={ICON_SIZE[size]} />
    </button>
  )
}
