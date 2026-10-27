import Icon from '../../../shared/components/Icon'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { textoRaciones, textoTiempo } from '../lib/recetas'

interface Props {
  raciones?: number
  tiempoMin?: number
  /** Solo si no hay raciones: el peso cocinado dice entonces cuánto sale. */
  pesoG?: number
}

/** Raciones, tiempo y peso de una receta en una línea con iconos, para las filas de las listas. */
export default function DatosReceta({ raciones, tiempoMin, pesoG }: Props) {
  if (!raciones && !tiempoMin && !pesoG) return null
  return (
    <p className="tabular mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-caption text-fg-muted">
      {raciones ? <span className="inline-flex items-center gap-1"><Icon name="users" size={14} /><span aria-hidden>{formatNumber(raciones, 1)}</span><span className="sr-only">{textoRaciones(raciones)}</span></span> : null}
      {tiempoMin ? <span className="inline-flex items-center gap-1"><Icon name="timer" size={14} />{textoTiempo(tiempoMin)}</span> : null}
      {pesoG ? <span className="inline-flex items-center gap-1"><Icon name="scale" size={14} />{formatInt(pesoG)} g</span> : null}
    </p>
  )
}
