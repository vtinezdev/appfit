import { useId } from 'react'
import { formatInt } from '../../../shared/lib/format'
import { METROS_POR_HITO, type Expedicion } from '../lib/cumbres'
import { puntoEnLadera, trazadoSilueta, yDeFraccion, type Lienzo } from '../lib/perfil'

const LIENZOS = {
  tarjeta: { ancho: 320, alto: 72, margen: 8 },
  pagina: { ancho: 320, alto: 140, margen: 10 },
} as const satisfies Record<string, Lienzo>

interface Props {
  expedicion: Pick<Expedicion, 'montana' | 'metros'>
  variante?: keyof typeof LIENZOS
  /** Dentro de un botón: solo decorativo (las cifras van en el texto de al lado). */
  decorativo?: boolean
}

/**
 * Perfil de la montaña: silueta genérica cuya altura es la altitud de la cima, lo subido relleno desde abajo como la
 * barra (`fg` sobre `fg` al 20 %) y una marca en la ladera. En la página, una línea cada 1.000 m. Sin animación.
 */
export default function PerfilMontana({ expedicion, variante = 'pagina', decorativo = false }: Props) {
  const clip = `perfil-${useId().replace(/[^\w-]/g, '')}`
  const l = LIENZOS[variante]
  const { altitud } = expedicion.montana
  const fraccion = altitud > 0 ? expedicion.metros / altitud : 0
  const yRelleno = yDeFraccion(l, fraccion)
  const marca = puntoEnLadera(l, fraccion)
  const silueta = trazadoSilueta(l)
  const hitos: number[] = []
  if (variante === 'pagina') for (let h = METROS_POR_HITO; h < altitud; h += METROS_POR_HITO) hitos.push(h)
  const accesible = decorativo
    ? { 'aria-hidden': true }
    : { role: 'img', 'aria-label': `${expedicion.montana.nombre}: ${formatInt(expedicion.metros)} de ${formatInt(altitud)} m subidos` }

  return (
    <svg viewBox={`0 0 ${l.ancho} ${l.alto}`} className="block h-auto w-full overflow-visible" {...accesible}>
      <defs>
        <clipPath id={clip}><rect x={0} y={yRelleno} width={l.ancho} height={l.alto - yRelleno} /></clipPath>
      </defs>
      <path d={silueta} className="fill-fg/20" />
      <path d={silueta} className="fill-fg" clipPath={`url(#${clip})`} />
      {hitos.map((h) => {
        const y = yDeFraccion(l, h / altitud)
        return <line key={h} x1={0} x2={l.ancho} y1={y} y2={y} strokeWidth={1.5} className="stroke-surface" />
      })}
      <circle cx={marca.x} cy={marca.y} r={variante === 'pagina' ? 6 : 5} strokeWidth={2.5} className="fill-surface stroke-fg" />
    </svg>
  )
}
