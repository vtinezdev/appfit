import { ICONO, LOGOTIPO, NOMBRE_APP } from '../design/marca'

/**
 * Icono de la marca dentro de la app (ADR 064): en blanco y negro según el tema, en un círculo. El icono de la pantalla
 * de inicio (grafito y volt) es `public/favicon.svg`. Decorativo: el nombre lo lleva siempre el logotipo o el texto de al lado.
 */
export function MarcaIcono({ tam = 40, className = '' }: { tam?: number; className?: string }) {
  return (
    <span aria-hidden className={`inline-flex shrink-0 overflow-hidden rounded-pill border border-line bg-surface text-fg ${className}`}>
      <svg viewBox={ICONO.viewBox} width={tam} height={tam} fill="currentColor">
        <g transform={`translate(50 50) scale(0.72) translate(-50 -50) ${ICONO.encaje}`}>
          <path d={ICONO.cumbre} />
          <path d={ICONO.montes} />
          {ICONO.mancuerna.map(([x, y, w, h, r]) => <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx={r} />)}
        </g>
      </svg>
    </span>
  )
}

/**
 * «CUMBRA FIT»: letras talladas que suben y la A como cumbre, con las montañas dentro. La cumbre y «FIT» van en el acento
 * de texto (volt claro en oscuro, oliva en claro, por contraste); el resto, en el color del texto.
 */
export function MarcaLogotipo({ alto = 32, className = '' }: { alto?: number; className?: string }) {
  const ancho = Math.round(alto * LOGOTIPO.proporcion)
  return (
    <span role="img" aria-label={NOMBRE_APP} className={`inline-flex items-end gap-1 text-fg ${className}`}>
      <svg viewBox={LOGOTIPO.viewBox} height={alto} width={ancho} aria-hidden fill="currentColor">
        <path d={LOGOTIPO.letras} fillRule="evenodd" />
        <path d={LOGOTIPO.cumbre} className="text-accent-strong" fill="currentColor" />
        <path d={LOGOTIPO.montes} />
      </svg>
      <span aria-hidden className="text-rotulo text-accent-strong">FIT</span>
    </span>
  )
}

/** Icono y logotipo juntos: la firma de la app (pie de Ajustes, pantalla de error). */
export function MarcaFirma({ alto = 32, className = '' }: { alto?: number; className?: string }) {
  const icono = Math.round(alto * 1.25)
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <MarcaIcono tam={icono} />
      <MarcaLogotipo alto={alto} />
    </span>
  )
}
