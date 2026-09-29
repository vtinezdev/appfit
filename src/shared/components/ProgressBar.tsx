import { useEffect, useState } from 'react'

interface Props {
  value: number
  /** Objetivo. Es la meta del carril: siempre se marca. Superarlo NO cambia a rojo: el carril se extiende y la parte que pasa de la meta se atenúa. */
  goal: number
  /** Clase de fondo semántica (bg-kcal, bg-protein…) */
  colorClass?: string
  /** `lg` para la métrica principal de una pantalla, `md` para las secundarias. */
  size?: 'md' | 'lg'
  label?: string
  /** Texto para lectores de pantalla («132 de 150 g»); sin él se lee el valor a secas. */
  valueText?: string
}

const SIZES = {
  md: { track: 'h-2', tick: '-inset-y-1 w-0.5' },
  lg: { track: 'h-3', tick: '-inset-y-1.5 w-1' },
}

/**
 * Carril hacia un objetivo (el lenguaje «Dorsal» de la app): pista con relleno, línea de meta y, si te pasas,
 * un tramo atenuado después de la meta. El dominio es max(objetivo, valor), así que nada se corta al 100 %.
 * El relleno crece desde 0 al montarse y sigue los cambios con una transición (0 con prefers-reduced-motion).
 * El color no es el único indicador: la meta es una marca física y quien lo use debe escribir el dato en texto.
 */
export default function ProgressBar({ value, goal, colorClass = 'bg-accent', size = 'md', label, valueText }: Props) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const v = Math.max(value, 0)
  const hasGoal = goal > 0
  const over = hasGoal && v > goal
  const domain = Math.max(goal, v, 1)
  const pct = (n: number) => (ready ? Math.min(100, (n / domain) * 100) : 0)
  const s = SIZES[size]
  const grow = 'transition-[left,width] duration-long ease-standard'

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(domain)}
      aria-valuenow={Math.round(v)}
      aria-valuetext={valueText}
      className={`relative w-full ${s.track}`}
    >
      <div className="absolute inset-0 overflow-hidden rounded-pill bg-surface-muted">
        <div className={`absolute inset-y-0 left-0 ${over ? 'rounded-l-pill' : 'rounded-pill'} ${colorClass} ${grow}`} style={{ width: `${pct(over ? goal : v)}%` }} />
        {over && <div className={`absolute inset-y-0 rounded-r-pill opacity-50 ${colorClass} ${grow}`} style={{ left: `${pct(goal)}%`, width: `${pct(v) - pct(goal)}%` }} />}
      </div>
      {hasGoal && (
        <div
          className={`absolute rounded-pill bg-goal ring-2 ring-surface transition-[left] duration-long ease-standard ${s.tick}`}
          style={{ left: `calc(${Math.min(100, (goal / domain) * 100)}% - 0.125rem)` }}
          aria-hidden
        />
      )}
    </div>
  )
}
