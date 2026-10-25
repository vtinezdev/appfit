import type { HTMLAttributes } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  /** Una unidad real de información. `muted` para contexto dentro de una tarea. */
  tone?: 'default' | 'muted'
  padded?: boolean
}

const TONES = {
  default: 'border border-transparent bg-surface shadow-card',
  muted: 'bg-surface-muted',
}

/** Superficie base de contenido. Una sola forma de «tarjeta»: cambiar `bg-surface`/`rounded-lg` aquí lo cambia en toda la app. */
export default function Card({ tone = 'default', padded = true, className = '', ...rest }: Props) {
  return <div className={`app-card rounded-lg ${TONES[tone]} ${padded ? 'p-card' : ''} ${className}`} {...rest} />
}
