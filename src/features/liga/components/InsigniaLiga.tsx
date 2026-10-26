import IconoLiga from './IconoLiga'
import { SEMANAS_POR_LIGA, type NombreLiga } from '../lib/liga'

/** Insignia topográfica; el nombre y las semanas siguen en texto junto a ella. */
export default function InsigniaLiga({ liga, size = 24, className = '' }: { liga: NombreLiga | null; size?: number; className?: string }) {
  return <span className={`block shrink-0 ${className}`}><IconoLiga liga={liga} tamano={size >= 48 ? 'lg' : size >= 32 ? 'md' : 'sm'} /></span>
}

/** Las semanas hechas dentro de la liga, como una barra de tres tramos hacia la siguiente (decorativo: la cifra va en texto). */
export function SemanasLiga({ semana, className = '' }: { semana: number; className?: string }) {
  return <span aria-hidden className={`flex shrink-0 items-center gap-0.5 ${className}`}>
    {Array.from({ length: SEMANAS_POR_LIGA }, (_, i) => <span key={i} className={`h-1.5 w-5 rounded-pill ${i < semana ? 'bg-accent-strong' : 'bg-line-strong'}`} />)}
  </span>
}
