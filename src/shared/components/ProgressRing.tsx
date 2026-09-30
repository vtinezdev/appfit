import { useEffect, useState, type ReactNode } from 'react'
import { tramosCarril } from '../design/carril'

interface Props {
  value: number
  /** Objetivo. Es la meta del anillo: siempre se marca. Superarlo NO cambia a rojo: lo que pasa de la meta se atenúa. */
  goal: number
  /** Clase de trazo semántica (stroke-kcal, stroke-protein…) */
  colorClass?: string
  /** Lado del anillo en px (el SVG se dibuja a ese tamaño). */
  size?: number
  /** Grosor del trazo en px. */
  thickness?: number
  label?: string
  /** Texto para lectores de pantalla («1.250 de 2.200 kcal»); sin él se lee el valor a secas. */
  valueText?: string
  /** Contenido del centro (la cifra principal). */
  children?: ReactNode
}

/**
 * Anillo hacia un objetivo: el mismo lenguaje que ProgressBar (pista `surface-muted`, relleno del color del dato,
 * marca de meta siempre visible, exceso atenuado, dominio max(objetivo, valor)) con forma circular. Empieza arriba
 * y crece desde 0 al montarse; con prefers-reduced-motion la transición dura 0 (lo dicen los tokens).
 * El color no es el único indicador: quien lo use debe escribir el dato en texto (p. ej. en `children`).
 */
export default function ProgressRing({ value, goal, colorClass = 'stroke-accent', size = 128, thickness = 12, label, valueText, children }: Props) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const t = tramosCarril(value, goal)
  const c = size / 2
  const r = (size - thickness) / 2
  const circ = 2 * Math.PI * r
  const arco = (fraccion: number) => `${ready ? fraccion * circ : 0} ${circ}`
  const domain = Math.max(goal, value, 1)
  const grow = 'transition-[stroke-dasharray,stroke-dashoffset] duration-long ease-standard'
  const tick = thickness / 2 + 3

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(domain)}
      aria-valuenow={Math.round(Math.max(value, 0))}
      aria-valuetext={valueText}
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" aria-hidden className="-rotate-90">
        <circle cx={c} cy={c} r={r} strokeWidth={thickness} className="stroke-surface-muted" />
        {t.relleno > 0 && (
          <circle cx={c} cy={c} r={r} strokeWidth={thickness} strokeLinecap="round" strokeDasharray={arco(t.relleno)} className={`${colorClass} ${grow}`} />
        )}
        {t.exceso > 0 && (
          <circle
            cx={c}
            cy={c}
            r={r}
            strokeWidth={thickness}
            strokeLinecap="butt"
            strokeDasharray={arco(t.exceso)}
            strokeDashoffset={ready ? -t.relleno * circ : 0}
            className={`opacity-50 ${colorClass} ${grow}`}
          />
        )}
        {t.meta !== null && (
          <g transform={`rotate(${t.meta * 360} ${c} ${c})`}>
            <line x1={c + r - tick} y1={c} x2={c + r + tick} y2={c} strokeWidth={5} strokeLinecap="round" className="stroke-surface" />
            <line x1={c + r - tick} y1={c} x2={c + r + tick} y2={c} strokeWidth={2.5} strokeLinecap="round" className="stroke-goal" />
          </g>
        )}
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>}
    </div>
  )
}
