import type { ButtonHTMLAttributes } from 'react'

const PRESS = 'transition-[background-color,opacity] duration-short active:opacity-80'

const TONES = {
  // Dentro de un ListGroup plano con divisores: fila a todo el ancho, sin radio.
  plain: 'rounded-none px-1 text-fg transition-colors duration-short hover:bg-surface-muted active:bg-surface-muted',
  muted: `rounded-md bg-surface-muted px-3 text-fg hover:bg-line ${PRESS}`,
  accent: `rounded-md bg-accent-subtle px-3 text-accent-strong ${PRESS}`,
  // Sin fondo: para listas planas con divisores (`ul.divide-y divide-line`), como las comidas de Hoy. Solo se marca al pulsar.
  flat: 'rounded-md px-1 text-fg transition-colors duration-short hover:bg-surface-muted active:bg-surface-muted',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** `plain` dentro de un `ListGroup`, `muted` dentro de sheets/cards, `accent` para «crear …», `flat` en listas con hairlines sobre el fondo. */
  tone?: keyof typeof TONES
}

/** Fila pulsable de una lista (alimento, plantilla, rutina, ejercicio, acción de menú). */
export default function ListRow({ tone = 'plain', className = '', type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={`flex min-h-touch w-full items-center justify-between gap-3 py-3 text-left disabled:opacity-40 ${TONES[tone]} ${className}`}
      {...rest}
    />
  )
}
