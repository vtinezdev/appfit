import { formatKm, kmTexto } from '../../actividades/lib/actividad'
import { finalesDeEtapa, type Expedicion } from '../lib/caminos'
import { metrosRuta } from '../lib/rutas'

const ANCHO = 320
const ALTO = 28
const MARGEN = 8
const Y = ALTO / 2

interface Props {
  expedicion: Pick<Expedicion, 'ruta' | 'metros'>
  /** Dentro de un botón: solo decorativo (las cifras van en el texto de al lado). */
  decorativo?: boolean
}

/**
 * La ruta como una línea de salida a llegada, con un punto al final de cada etapa a su distancia real: lo recorrido en
 * `fg` sobre `fg` al 20 % (como la barra) y una marca donde se va. Las etapas alcanzadas, rellenas. Sin mapa ni
 * animación.
 */
export default function TrazadoCamino({ expedicion, decorativo = false }: Props) {
  const total = metrosRuta(expedicion.ruta)
  const x = (m: number) => Math.round((MARGEN + (Math.min(m, total) / Math.max(total, 1)) * (ANCHO - 2 * MARGEN)) * 10) / 10
  const actual = x(expedicion.metros)
  const finales = finalesDeEtapa(expedicion.ruta)
  const accesible = decorativo
    ? { 'aria-hidden': true }
    : { role: 'img', 'aria-label': `${expedicion.ruta.nombre}: ${formatKm(expedicion.metros)} de ${kmTexto(total)}` }
  return (
    <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="block h-auto w-full overflow-visible" {...accesible}>
      <line x1={MARGEN} x2={ANCHO - MARGEN} y1={Y} y2={Y} strokeWidth={4} strokeLinecap="round" className="stroke-fg/20" />
      {expedicion.metros > 0 && <line x1={MARGEN} x2={actual} y1={Y} y2={Y} strokeWidth={4} strokeLinecap="round" className="stroke-fg" />}
      {finales.slice(0, -1).map((fin) => <circle key={fin} cx={x(fin)} cy={Y} r={2.5} className={expedicion.metros >= fin ? 'fill-surface' : 'fill-fg/40'} />)}
      <circle cx={x(total)} cy={Y} r={5} strokeWidth={2.5} className={expedicion.metros >= total ? 'fill-fg stroke-fg' : 'fill-surface stroke-fg'} />
      <circle cx={actual} cy={Y} r={6} strokeWidth={2.5} className="fill-surface stroke-fg" />
    </svg>
  )
}
