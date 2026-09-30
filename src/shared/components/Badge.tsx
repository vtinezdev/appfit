import type { ReactNode } from 'react'

type Tone = 'neutral' | 'accent' | 'warning'

interface Props {
  children: ReactNode
  tone?: Tone
  /** Punto de color de un dato (`bg-protein`…): el color acompaña al texto, nunca lo sustituye. */
  dotClass?: string
  className?: string
}

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-muted text-fg-muted',
  accent: 'bg-accent-subtle text-accent-strong',
  warning: 'text-warning ring-1 ring-inset ring-warning',
}

/** Pastilla informativa: procedencia («Tuyo», «CIQUAL»), contadores, % de reparto. No es pulsable. */
export default function Badge({ children, tone = 'neutral', dotClass, className = '' }: Props) {
  return (
    <span className={`tabular inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 py-0.5 text-caption font-semibold ${TONES[tone]} ${className}`}>
      {dotClass && <span className={`h-2 w-2 rounded-pill ${dotClass}`} aria-hidden />}
      {children}
    </span>
  )
}
