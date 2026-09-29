import type { SVGProps } from 'react'

/**
 * Iconos propios (24×24, trazo 1.75, esquinas redondeadas): no hace falta ninguna librería para ~20 iconos.
 * Solo se añaden iconos con función (navegar, actuar, indicar estado), nunca decorativos.
 * Para cambiar el grosor de todo el set: `strokeWidth` de abajo.
 */
const PATHS = {
  utensils: 'M7 3v8a2 2 0 0 0 2 2v8M11 3v8a2 2 0 0 1-2 2M9 3v8M17 21V3c-2 1.5-3 4-3 7v3h3',
  dumbbell: 'M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11',
  settings: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  mic: 'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v4',
  stop: 'M7 7h10v10H7z',
  loader: 'M12 3a9 9 0 1 0 9 9',
  'chevron-left': 'M15 5l-7 7 7 7',
  'chevron-right': 'M9 5l7 7-7 7',
  'arrow-left': 'M19 12H5M11 6l-6 6 6 6',
  more: 'M5 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0M11 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0M17 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0',
  close: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  pencil: 'M4 20l1-4L16 5l3 3L8 19zM14 7l3 3',
  sparkles: 'M12 4l1.8 4.7L18.5 10.5l-4.7 1.8L12 17l-1.8-4.7L5.5 10.5l4.7-1.8zM19 16l.7 1.8L21.5 18.5l-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z',
  copy: 'M9 9h10v11H9zM5 15V4h10',
  search: 'M4 11a7 7 0 1 0 14 0a7 7 0 1 0-14 0M20 20l-4.2-4.2',
  alert: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 7.5v5.5M12 16.25v.01',
} as const

export type IconName = keyof typeof PATHS

interface Props extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  name: IconName
  size?: number
  /** Si el icono es lo único que dice qué hace un elemento, pon aquí su nombre accesible. Sin label queda oculto a lectores. */
  label?: string
}

export default function Icon({ name, size = 20, label, className = '', ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${name === 'loader' ? 'animate-spin motion-reduce:animate-none' : ''} ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
