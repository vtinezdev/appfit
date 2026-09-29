import type { ButtonHTMLAttributes } from 'react'

const PRESS = 'transition-opacity duration-short active:opacity-80'

const TONES = {
  surface: `bg-surface px-3 text-fg shadow-raised ${PRESS}`,
  muted: `bg-surface-muted px-3 text-fg ${PRESS}`,
  accent: `bg-accent-subtle px-3 text-accent ${PRESS}`,
  // Sin fondo: para listas planas con divisores (`ul.divide-y divide-line`), como las comidas de Hoy. Solo se marca al pulsar.
  flat: 'px-1 text-fg transition-colors duration-short active:bg-surface-muted',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** `surface` sobre el fondo de pantalla, `muted` dentro de sheets/cards, `accent` para «crear …», `flat` en listas con hairlines. */
  tone?: keyof typeof TONES
}

/** Fila pulsable de una lista (alimento, plantilla, rutina, ejercicio, acción de menú). */
export default function ListRow({ tone = 'surface', className = '', type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={`flex min-h-touch w-full items-center justify-between gap-2 rounded-md py-2 text-left disabled:opacity-40 ${TONES[tone]} ${className}`}
      {...rest}
    />
  )
}
