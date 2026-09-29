import type { HTMLAttributes } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  /** `muted` para agrupar dentro de otra superficie sin apilar cards del mismo color. */
  tone?: 'default' | 'muted'
  padded?: boolean
}

/** Superficie base de contenido. Una sola forma de «tarjeta»: cambiar `bg-surface`/`rounded-lg` aquí lo cambia en toda la app. */
export default function Card({ tone = 'default', padded = true, className = '', ...rest }: Props) {
  const bg = tone === 'muted' ? 'bg-surface-muted' : 'bg-surface shadow-raised'
  return <div className={`rounded-lg ${bg} ${padded ? 'p-card' : ''} ${className}`} {...rest} />
}
