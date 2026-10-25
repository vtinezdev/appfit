import type { PuntoRecorrido } from '../../../shared/db/types'
import { proyectarRecorrido } from '../../actividades/lib/geo'

const ANCHO = 320
const ALTO = 200

interface Props {
  /** Salida y paradas en orden, con coordenadas. */
  puntos: readonly PuntoRecorrido[]
  /** Lo recorrido (puntos pasados y la posición), si se va por ella. */
  recorrido?: readonly PuntoRecorrido[]
  posicion?: PuntoRecorrido
  label: string
}

/**
 * Una ruta propia dibujada sin mapa (nada sale del móvil): la línea entre sus paradas con el norte arriba, en `fg` al
 * 30 %, lo recorrido en `fg`, un punto en cada parada (también la salida), la llegada con un aro y la marca donde se va
 * (un círculo relleno con borde del color de la superficie).
 */
export default function MapaRuta({ puntos, recorrido, posicion, label }: Props) {
  const t = proyectarRecorrido([puntos, ...(recorrido && recorrido.length >= 2 ? [recorrido] : [])], ANCHO, ALTO, 14, posicion ? [posicion] : [])
  if (!t) return null
  const [todos, hecho] = [t.puntos[0], t.puntos[1]]
  const llegada = todos[todos.length - 1]
  const marca = t.extras[0]
  return (
    <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="block h-auto w-full" role="img" aria-label={label}>
      <path d={t.tramos[0]} fill="none" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="stroke-fg/30" />
      {hecho && <path d={t.tramos[1]} fill="none" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="stroke-fg" />}
      {todos.slice(0, -1).map(([x, y], i) => <circle key={i} cx={x} cy={y} r={3.5} className="fill-fg" />)}
      <circle cx={llegada[0]} cy={llegada[1]} r={5} strokeWidth={2.5} className="fill-surface stroke-fg" />
      {marca && <circle cx={marca[0]} cy={marca[1]} r={7} strokeWidth={3} className="fill-fg stroke-surface" />}
    </svg>
  )
}
