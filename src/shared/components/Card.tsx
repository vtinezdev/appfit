import type { HTMLAttributes } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  /**
   * `default` blanca con sombra suave · `muted` gris, para agrupar dentro de otra superficie ·
   * `ink` negra: el resumen principal de una pantalla (como mucho una). Redefine los tokens semánticos
   * (`[data-surface='ink']` en tokens.css): todo lo de dentro (anillos, texto, botones ghost) se adapta solo.
   */
  tone?: 'default' | 'muted' | 'ink'
  padded?: boolean
}

const TONES = {
  default: 'bg-surface shadow-raised',
  muted: 'bg-surface-muted',
  ink: 'bg-surface text-fg shadow-raised',
}

/** Superficie base de contenido. Una sola forma de «tarjeta»: cambiar `bg-surface`/`rounded-lg` aquí lo cambia en toda la app. */
export default function Card({ tone = 'default', padded = true, className = '', ...rest }: Props) {
  return <div data-surface={tone === 'ink' ? 'ink' : undefined} className={`rounded-lg ${TONES[tone]} ${padded ? 'p-card' : ''} ${className}`} {...rest} />
}
