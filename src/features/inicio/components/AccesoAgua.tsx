import Icon from '../../../shared/components/Icon'
import ProgressBar from '../../../shared/components/ProgressBar'
import { AGUA_POR_DEFECTO_ML, formatAgua, type ObjetivoAgua } from '../lib/agua'
import TarjetaAcceso from './TarjetaAcceso'

interface Props {
  ml: number
  objetivo: ObjetivoAgua | null
  onAnadir: () => void
  onAbrir: () => void
}

/** Agua del día: lo bebido (y el objetivo si lo hay). «+» suma una toma de 250 ml; la tarjeta abre más opciones. */
export default function AccesoAgua({ ml, objetivo, onAnadir, onAbrir }: Props) {
  return (
    <TarjetaAcceso etiqueta="Agua" onAbrir={onAbrir}
      accion={
        <button type="button" aria-label={`Añadir ${formatAgua(AGUA_POR_DEFECTO_ML)} de agua`} onClick={onAnadir}
          className="app-button inline-flex h-touch w-touch items-center justify-center rounded-md text-accent-strong hover:bg-surface-muted">
          <Icon name="plus" size={20} />
        </button>
      }>
      <span className="tabular flex flex-wrap items-baseline gap-x-1.5 text-fg">
        <span className="font-numeric text-heading">{formatAgua(ml)}</span>
        {objetivo && <span className="text-caption text-fg-muted">de {formatAgua(objetivo.ml)}</span>}
      </span>
      {objetivo ? <ProgressBar value={ml} goal={objetivo.ml} colorClass="bg-accent" label="Agua bebida hoy" valueText={`${formatAgua(ml)} de ${formatAgua(objetivo.ml)}`} />
        : <span className="text-body-sm text-fg-muted">Sin objetivo</span>}
    </TarjetaAcceso>
  )
}
