import type { PuntoRecorrido } from '../../../shared/db/types'
import { proyectarRecorrido } from '../lib/geo'

const LIENZOS = {
  pagina: { ancho: 320, alto: 200 },
  fila: { ancho: 48, alto: 48 },
} as const

interface Props {
  recorrido: readonly (readonly PuntoRecorrido[])[] | undefined
  variante?: keyof typeof LIENZOS
  /** Nombre accesible; sin él, decorativo (las cifras van en el texto de al lado). */
  label?: string
}

/**
 * El recorrido como una línea, sin mapa (nada sale del móvil): proyección local con el norte arriba, en grafito; la
 * salida es un círculo hueco y la llegada, uno relleno. Sin dos puntos no dibuja nada.
 */
export default function TrazadoRecorrido({ recorrido, variante = 'pagina', label }: Props) {
  const l = LIENZOS[variante]
  const t = recorrido ? proyectarRecorrido(recorrido, l.ancho, l.alto, variante === 'fila' ? 4 : 12) : null
  if (!t) return null
  const fila = variante === 'fila'
  const accesible = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true }
  return (
    <svg viewBox={`0 0 ${l.ancho} ${l.alto}`} className={fila ? 'block h-thumb w-thumb shrink-0' : 'block h-auto w-full'} {...accesible}>
      {t.tramos.map((d, i) => <path key={i} d={d} fill="none" strokeWidth={fila ? 2 : 3} strokeLinecap="round" strokeLinejoin="round" className="stroke-fg" />)}
      {!fila && t.inicio && <circle cx={t.inicio[0]} cy={t.inicio[1]} r={5} strokeWidth={2.5} className="fill-surface stroke-fg" />}
      {!fila && t.fin && <circle cx={t.fin[0]} cy={t.fin[1]} r={5} className="fill-fg" />}
    </svg>
  )
}
