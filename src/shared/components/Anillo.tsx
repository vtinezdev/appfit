import type { ReactNode } from 'react'

interface Props {
  /** Parte recorrida, de 0 a 1 (se recorta a ese rango). */
  fraccion: number
  /** Tamaño de la caja (clases de alto/ancho de la escala: `h-9 w-9`…). */
  className?: string
  /** Clase de trazo del tramo recorrido (`stroke-kcal`, `stroke-fg`…). */
  trazo?: string
  /** Clase de trazo del carril. */
  carril?: string
  /** Grosor en unidades del viewBox (36). */
  grosor?: number
  /** Lo que va dentro (número del día, icono…). */
  children?: ReactNode
}

const LADO = 36

/**
 * Anillo pequeño de progreso para un dato por unidad (un día de la semana, un logro): carril completo y tramo recorrido
 * desde arriba en el sentido del reloj, con extremos redondeados. Decorativo: quien lo usa da la misma cifra en texto.
 * No es la rueda de energía de Inicio (ADR 021) ni un contador: el valor aparece ya en su sitio.
 */
export default function Anillo({ fraccion, className = 'h-9 w-9', trazo = 'stroke-fg', carril = 'stroke-line', grosor = 3, children }: Props) {
  const f = Number.isFinite(fraccion) ? Math.min(Math.max(fraccion, 0), 1) : 0
  const r = (LADO - grosor) / 2
  const circ = 2 * Math.PI * r
  return (
    <span className={`relative inline-grid shrink-0 place-items-center ${className}`}>
      <svg viewBox={`0 0 ${LADO} ${LADO}`} className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true" fill="none">
        <circle cx={LADO / 2} cy={LADO / 2} r={r} strokeWidth={grosor} className={carril} />
        {f > 0 && <circle cx={LADO / 2} cy={LADO / 2} r={r} strokeWidth={grosor} strokeLinecap="round" className={trazo}
          strokeDasharray={`${f * circ} ${circ}`} />}
      </svg>
      {children !== undefined && <span className="relative">{children}</span>}
    </span>
  )
}
