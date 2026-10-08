import type { SVGProps } from 'react'

/**
 * Iconos propios (24×24, trazo 1.75, esquinas redondeadas): no hace falta ninguna librería para ~20 iconos.
 * Solo se añaden iconos con función (navegar, actuar, indicar estado o una categoría de alimento), nunca decorativos.
 * Para cambiar el grosor de todo el set: `strokeWidth` de abajo.
 */
const PATHS = {
  menu: 'M4 6h16M4 12h16M4 18h16',
  user: 'M8 8a4 4 0 1 0 8 0a4 4 0 1 0-8 0M4.5 21a7.5 7.5 0 0 1 15 0',
  home: 'M4 11l8-7 8 7M6 9.5V20h4v-5h4v5h4V9.5',
  utensils: 'M7 3v8a2 2 0 0 0 2 2v8M11 3v8a2 2 0 0 1-2 2M9 3v8M17 21V3c-2 1.5-3 4-3 7v3h3',
  sunrise: 'M3 17h18M5 21h14M6 17a6 6 0 0 1 12 0M12 3v3M4.2 8.2l2.1 2.1M19.8 8.2l-2.1 2.1M2 13h2M20 13h2',
  moon: 'M20.5 14A8.5 8.5 0 0 1 10 3.5A8.5 8.5 0 1 0 20.5 14',
  zap: 'M13 3L5 13h6l-1 8 9-11h-6z',
  dumbbell: 'M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11',
  settings: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  stop: 'M7 7h10v10H7z',
  timer: 'M9 3h6M12 3v3M18 6l2 2M12 10v4l3 2M4 14a8 8 0 1 0 16 0a8 8 0 1 0-16 0',
  trophy: 'M8 3h8v6a4 4 0 0 1-8 0V3M8 5H4v3a4 4 0 0 0 4 4M16 5h4v3a4 4 0 0 1-4 4M12 13v6M8 21h8M10 19h4',
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
  grip: 'M8 5v.01M16 5v.01M8 12v.01M16 12v.01M8 19v.01M16 19v.01',
  move: 'M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3',
  sparkles: 'M12 4l1.8 4.7L18.5 10.5l-4.7 1.8L12 17l-1.8-4.7L5.5 10.5l4.7-1.8zM19 16l.7 1.8L21.5 18.5l-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z',
  copy: 'M9 9h10v11H9zM5 15V4h10',
  search: 'M4 11a7 7 0 1 0 14 0a7 7 0 1 0-14 0M20 20l-4.2-4.2',
  alert: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 7.5v5.5M12 16.25v.01',
  info: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 11v5.5M12 7.75v.01',
  barcode: 'M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10.5 8v8M13.5 8v8M17 8v8',
  // Familias de categorías de alimento (`nutricion/lib/iconosCategoria.ts`): sustituyen al nombre, que se ve al pulsar.
  'cat-fruta': 'M12 8c-1.5-1.2-3.6-1.5-5.1-.5C4.7 9 4.4 12.6 5.9 16c1.2 2.8 3 4.5 4.6 4.5.6 0 1-.4 1.5-.4s.9.4 1.5.4c1.6 0 3.4-1.7 4.6-4.5 1.5-3.4 1.2-7-1-8.5-1.5-1-3.6-.7-5.1.5M12 8c0-2 .8-3.5 2.5-4.5',
  'cat-verdura': 'M14.5 9.5c-1.5-1.5-3.8-1.4-5.3.1C6.8 12 4.6 17.4 5 19c1.6.4 7-1.8 9.4-4.2 1.5-1.5 1.6-3.8.1-5.3M14.5 9.5l1-5M14.5 9.5l5-1M14.5 9.5L18 6M8.5 14.5l1.5 1.5M11 12l1 1',
  'cat-legumbre': 'M3.5 15.5C7 9.5 14.5 6.5 20.5 8c-2 6.5-11 10.5-17 7.5zM8 14a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0-2.6 0M12.2 12.3a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0-2.6 0',
  'cat-cereal': 'M12 21V8M12 8c-1.8-.9-2.8-2.6-2.8-4.5 1.8.4 2.8 2.3 2.8 4.5zM12 8c1.8-.9 2.8-2.6 2.8-4.5-1.8.4-2.8 2.3-2.8 4.5zM12 13c-2.3-.4-3.8-2.2-3.8-4.2 2.3.3 3.8 1.9 3.8 4.2zM12 13c2.3-.4 3.8-2.2 3.8-4.2-2.3.3-3.8 1.9-3.8 4.2zM12 18c-2.3-.4-3.8-2.2-3.8-4.2 2.3.3 3.8 1.9 3.8 4.2zM12 18c2.3-.4 3.8-2.2 3.8-4.2-2.3.3-3.8 1.9-3.8 4.2z',
  'cat-dulce': 'M5.5 11h13l-1.7 9H7.2zM5.5 11a3 3 0 0 1 1.3-5.4A4.5 4.5 0 0 1 12 3.5a4.5 4.5 0 0 1 5.2 2.1A3 3 0 0 1 18.5 11M10 11l.4 9M14 11l-.4 9',
  'cat-carne': 'M14.8 3.5a5.7 5.7 0 1 1-1.6 11.2L9.6 18.3M14.8 3.5a5.7 5.7 0 0 0-5.5 7.1L5.7 14.2M5.7 14.2a1.8 1.8 0 1 0-1.4 3 1.8 1.8 0 1 0 2.5 2.5 1.8 1.8 0 1 0 2.8-1.4',
  'cat-pescado': 'M2.5 8l3 4-3 4M5.5 12c2.5-4 6-6 9.5-6 3 0 5.5 2.5 6.5 6-1 3.5-3.5 6-6.5 6-3.5 0-7-2-9.5-6zM16.5 10.5v.01M12 9c.8 2 .8 4 0 6',
  'cat-huevo': 'M12 3c-3.6 0-6.5 5.6-6.5 10.2a6.5 6.5 0 0 0 13 0C18.5 8.6 15.6 3 12 3z',
  'cat-lacteo': 'M9 3h6M9 3v2.5L7 8.5V21h10V8.5l-2-3V3M7 12h10',
  'cat-grasa': 'M12 3.5c-2.5 3.5-6 7.2-6 10.8a6 6 0 0 0 12 0c0-3.6-3.5-7.3-6-10.8zM9.5 15a2.5 2.5 0 0 0 2.5 2.5',
  'cat-bebida': 'M5.5 4h13l-1.6 16H7.1zM6.2 10h11.6M14 4l2-2',
  'cat-alcohol': 'M7.5 3h9v4.5a4.5 4.5 0 0 1-9 0zM12 12v8.5M8.5 20.5h7M7.5 7h9',
  'cat-snack': 'M6.5 4l1.4 1.4L9.3 4l1.4 1.4L12 4l1.4 1.4L14.8 4l1.4 1.4L17.5 4M6.8 5.5l.7 14.5h9l.7-14.5M9 14.5c1.4-2.6 4.6-3.3 6.2-1.7-1 2.6-4.2 3.7-6.2 1.7z',
  'cat-plato': 'M3.5 12h17a8.5 8.5 0 0 1-17 0zM9 9c-.6-1.1.6-2.2 0-3.5M12 9c-.6-1.1.6-2.2 0-3.5M15 9c-.6-1.1.6-2.2 0-3.5',
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
