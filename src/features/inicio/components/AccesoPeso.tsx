import Icon from '../../../shared/components/Icon'
import type { Peso } from '../../../shared/db/types'
import { formatNumber } from '../../../shared/lib/format'
import { miniGraficaPeso } from '../lib/miniGrafica'
import { fraseVariacion, type TendenciaPeso } from '../lib/peso'
import TarjetaAcceso from './TarjetaAcceso'

interface Props {
  /** `null`: todavía no hay ningún pesaje. */
  tendencia: TendenciaPeso | null
  /** Pesajes recientes para la minigráfica. */
  pesos: Pick<Peso, 'fecha' | 'kg'>[]
  hoy: string
  onRegistrar: () => void
  onVerHistorial: () => void
}

/**
 * Peso en Inicio: último pesaje, variación a 7 días y minigráfica de los últimos pesajes con el último marcado (dato neutro,
 * sin acento; SVG propio, Recharts no entra en Inicio) con
 * su relleno plano y el máximo y el mínimo del tramo al lado. La tarjeta abre el historial; «+» registra.
 */
export default function AccesoPeso({ tendencia, pesos, hoy, onRegistrar, onVerHistorial }: Props) {
  const grafica = miniGraficaPeso(pesos, hoy)
  return (
    <TarjetaAcceso
      etiqueta="Peso"
      onAbrir={onVerHistorial}
      accion={
        <button type="button" aria-label="Registrar peso" onClick={onRegistrar}
          className="app-button inline-flex h-touch w-touch items-center justify-center rounded-md text-fg-muted hover:bg-surface-muted hover:text-fg">
          <Icon name="plus" size={20} />
        </button>
      }
    >
      {tendencia ? <>
        <span className="tabular flex flex-wrap items-baseline gap-x-1.5 text-fg">
          <span className="font-numeric text-heading">{formatNumber(tendencia.actual, 1)}</span>
          <span className="text-caption text-fg-muted">kg</span>
        </span>
        {tendencia.variacion7d !== null && <span className="tabular text-body-sm text-fg-muted">{fraseVariacion(tendencia.variacion7d)}</span>}
        {grafica && <span className="mt-auto flex w-full items-stretch gap-1.5 pt-1">
          <svg viewBox="0 0 100 32" className="mini-grafica min-w-0 flex-1" aria-hidden="true" focusable="false">
            <path d={grafica.area} className="mini-grafica-area" />
            <path d={grafica.d} className="mini-grafica-linea" />
            <circle cx={grafica.ultimo.x} cy={grafica.ultimo.y} r={2.75} className="mini-grafica-punto" />
          </svg>
          {/* Escala del tramo: máximo arriba y mínimo abajo, para saber si la variación es mucho o poco. */}
          <span className="tabular flex shrink-0 flex-col justify-between text-caption leading-none text-fg-muted" aria-hidden="true">
            <span>{formatNumber(grafica.max, 1)}</span><span>{formatNumber(grafica.min, 1)}</span>
          </span>
        </span>}
      </> : <>
        <span className="text-title text-fg">Sin pesajes</span>
        <span className="text-body-sm text-fg-muted">Regístralo con +</span>
      </>}
    </TarjetaAcceso>
  )
}
