import Icon from '../../../shared/components/Icon'
import { formatNumber } from '../../../shared/lib/format'
import { fraseVariacion, type TendenciaPeso } from '../lib/peso'
import TarjetaAcceso from './TarjetaAcceso'

interface Props {
  /** `null`: todavía no hay ningún pesaje. */
  tendencia: TendenciaPeso | null
  onRegistrar: () => void
  onVerHistorial: () => void
}

/** Peso en Inicio: último pesaje y variación a 7 días (dato neutro, sin acento). La tarjeta abre el historial; «+» registra. */
export default function AccesoPeso({ tendencia, onRegistrar, onVerHistorial }: Props) {
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
      </> : <>
        <span className="text-title text-fg">Sin pesajes</span>
        <span className="text-body-sm text-fg-muted">Regístralo con +</span>
      </>}
    </TarjetaAcceso>
  )
}
