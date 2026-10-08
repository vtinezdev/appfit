import Icon from '../../../shared/components/Icon'
import ProgressBar from '../../../shared/components/ProgressBar'
import { AGUA_POR_DEFECTO_ML, formatAgua, partesAgua, type ObjetivoAgua } from '../lib/agua'
import TarjetaAcceso from './TarjetaAcceso'

interface Props {
  ml: number
  objetivo: ObjetivoAgua | null
  onAnadir: () => void
  onQuitar: () => void
  onAbrir: () => void
}

// Acciones de tarjeta en tono neutro: en Inicio el naranja queda para «Registrar comida» y la sección actual.
const BOTON = 'app-button inline-flex h-touch w-touch items-center justify-center rounded-md text-fg-muted enabled:hover:bg-surface-muted enabled:hover:text-fg disabled:opacity-30'

/**
 * Agua del día: lo bebido (y el objetivo si lo hay). «−» quita la última toma y «+» suma una de 250 ml; la tarjeta
 * abre más opciones.
 */
export default function AccesoAgua({ ml, objetivo, onAnadir, onQuitar, onAbrir }: Props) {
  return (
    <TarjetaAcceso etiqueta="Agua" onAbrir={onAbrir}
      accion={
        <div className="flex">
          <button type="button" aria-label="Quitar la última toma de agua" disabled={ml <= 0} onClick={onQuitar} className={BOTON}>
            <Icon name="minus" size={20} />
          </button>
          <button type="button" aria-label={`Añadir ${formatAgua(AGUA_POR_DEFECTO_ML)} de agua`} onClick={onAnadir} className={BOTON}>
            <Icon name="plus" size={20} />
          </button>
        </div>
      }>
      <span className="tabular flex flex-wrap items-baseline gap-x-1.5 text-fg">
        <span className="font-numeric text-heading">{partesAgua(ml).valor}</span>
        <span className="text-caption text-fg-muted">{partesAgua(ml).unidad}</span>
        {objetivo && <span className="text-caption text-fg-muted">de {formatAgua(objetivo.ml)}</span>}
      </span>
      {objetivo ? <ProgressBar value={ml} goal={objetivo.ml} colorClass="bg-fg-muted" label="Agua bebida hoy" valueText={`${formatAgua(ml)} de ${formatAgua(objetivo.ml)}`} />
        : <span className="text-body-sm text-fg-muted">Sin objetivo</span>}
    </TarjetaAcceso>
  )
}
