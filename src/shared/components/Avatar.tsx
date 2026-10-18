import type { ReactNode } from 'react'
import { iniciales } from '../lib/text'

type Tamano = 'sm' | 'md' | 'lg'

const TEXTO: Record<Tamano, string> = { sm: 'text-caption', md: 'text-body-sm', lg: 'text-heading' }

interface Props {
  /** Nombre o alias: da el monograma. El nombre accesible vive siempre en el texto de al lado. */
  nombre: string
  tamano?: Tamano
  /** Insignia elegida (un logro publicado). Sin ella, monograma en grafito: no hay un color por persona. */
  insignia?: ReactNode
  /** `cuadrado`: comunidades (escudo con monograma invertido), para no confundirlas con personas. */
  forma?: 'circulo' | 'cuadrado'
  className?: string
}

/** Cara de una persona o una comunidad en Social. Decorativa: nunca sustituye al nombre. */
export default function Avatar({ nombre, tamano = 'md', insignia, forma = 'circulo', className = '' }: Props) {
  if (insignia) return <span aria-hidden className={`app-avatar app-avatar-${tamano} app-avatar-insignia ${className}`}>{insignia}</span>
  const tono = forma === 'cuadrado' ? 'rounded-md bg-fg text-bg' : 'rounded-pill border border-line bg-surface-muted text-fg'
  return (
    <span aria-hidden className={`app-avatar app-avatar-${tamano} inline-flex shrink-0 items-center justify-center font-semibold ${tono} ${TEXTO[tamano]} ${className}`}>
      {iniciales(nombre)}
    </span>
  )
}
