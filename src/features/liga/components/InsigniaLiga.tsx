import { SEMANAS_POR_LIGA, type NombreLiga } from '../lib/liga'

/** Token de color de cada liga (`--c-liga-*` en tokens.css). */
const COLOR: Record<NombreLiga, string> = { Bronce: 'bronce', Plata: 'plata', Oro: 'oro', Zafiro: 'zafiro', Rubí: 'rubi', Élite: 'elite' }

const ESCUDO = 'M12 2.5 19.5 5.5V11c0 4.6-3.1 8.6-7.5 10.5C7.6 19.6 4.5 15.6 4.5 11V5.5z'
/** Marca interior: medalla en los metales, gema en las piedras y estrella en Élite (no depende solo del color). */
const MARCA: Record<NombreLiga, string> = {
  Bronce: 'M9 11.5a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
  Plata: 'M9 11.5a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
  Oro: 'M9 11.5a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
  Zafiro: 'M12 7.5 15.5 11 12 15.5 8.5 11z',
  Rubí: 'M12 7.5 15.5 11 12 15.5 8.5 11z',
  Élite: 'M12 6.8l1.5 3.1 3.4.5-2.5 2.4.6 3.4-3-1.6-3 1.6.6-3.4-2.5-2.4 3.4-.5z',
}

/**
 * Insignia de una liga: escudo con su color y una marca. Decorativa: el nombre de la liga va siempre en texto al lado.
 * Sin liga, solo el contorno.
 */
export default function InsigniaLiga({ liga, size = 24, className = '' }: { liga: NombreLiga | null; size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={`shrink-0 ${className}`}>
    {liga
      ? <>
          <path d={ESCUDO} style={{ fill: `rgb(var(--c-liga-${COLOR[liga]}))` }} />
          <path d={MARCA[liga]} style={{ fill: 'rgb(var(--c-surface))' }} />
        </>
      : <path d={ESCUDO} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinejoin="round" className="text-fg-subtle" />}
  </svg>
}

/** Las semanas hechas dentro de la liga, como puntos (decorativo: la cifra va en texto). */
export function SemanasLiga({ semana, className = '' }: { semana: number; className?: string }) {
  return <span aria-hidden className={`flex shrink-0 items-center gap-1 ${className}`}>
    {Array.from({ length: SEMANAS_POR_LIGA }, (_, i) => <span key={i} className={`h-2 w-2 rounded-pill ${i < semana ? 'bg-fg' : 'bg-line-strong'}`} />)}
  </span>
}
