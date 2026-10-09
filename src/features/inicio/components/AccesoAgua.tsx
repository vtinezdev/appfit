import { useId } from 'react'
import Icon from '../../../shared/components/Icon'
import { AGUA_POR_DEFECTO_ML, formatAgua, nivelVaso, partesAgua, type ObjetivoAgua } from '../lib/agua'
import TarjetaAcceso from './TarjetaAcceso'

interface Props {
  ml: number
  objetivo: ObjetivoAgua | null
  onAnadir: () => void
  onQuitar: () => void
  onAbrir: () => void
}

// Acciones de tarjeta en tono neutro: el naranja queda para el «+» de la barra y la sección actual.
const BOTON = 'app-button inline-flex h-touch w-touch items-center justify-center rounded-md text-fg-muted enabled:hover:bg-surface-muted enabled:hover:text-fg disabled:opacity-30'
// Vaso de 24 × 32: boca ancha arriba, base estrecha abajo.
const VASO = 'M3 2h18l-2.2 27a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8z'

/**
 * Agua del día: lo bebido y un vaso que se llena con la proporción respecto al objetivo (dato neutro, sin acento). Sin
 * objetivo, el vaso queda vacío y lo dice. «−» quita la última toma y «+» suma una de 250 ml; la tarjeta abre más opciones.
 */
export default function AccesoAgua({ ml, objetivo, onAnadir, onQuitar, onAbrir }: Props) {
  const nivel = nivelVaso(ml, objetivo)
  const clip = useId()
  return (
    <TarjetaAcceso etiqueta="Agua" onAbrir={onAbrir}
      pie={<>
        <button type="button" aria-label="Quitar la última toma de agua" disabled={ml <= 0} onClick={onQuitar} className={BOTON}>
          <Icon name="minus" size={20} />
        </button>
        <button type="button" aria-label={`Añadir ${formatAgua(AGUA_POR_DEFECTO_ML)} de agua`} onClick={onAnadir} className={BOTON}>
          <Icon name="plus" size={20} />
        </button>
      </>}>
      <span className="flex items-end justify-between gap-2">
        <span className="min-w-0">
          <span className="tabular flex flex-wrap items-baseline gap-x-1.5 text-fg">
            <span className="font-numeric text-heading">{partesAgua(ml).valor}</span>
            <span className="text-caption text-fg-muted">{partesAgua(ml).unidad}</span>
          </span>
          <span className="tabular block text-body-sm text-fg-muted">{objetivo ? `de ${formatAgua(objetivo.ml)}` : 'Sin objetivo'}</span>
        </span>
        <svg viewBox="0 0 24 32" className="vaso shrink-0" role="img" aria-label={objetivo ? `${formatAgua(ml)} de ${formatAgua(objetivo.ml)}` : `${formatAgua(ml)}, sin objetivo`}>
          <defs><clipPath id={clip}><path d={VASO} /></clipPath></defs>
          {nivel > 0 && <rect x="0" y={32 - 30 * nivel} width="24" height={30 * nivel} clipPath={`url(#${clip})`} className="vaso-agua" />}
          <path d={VASO} className="vaso-borde" />
        </svg>
      </span>
    </TarjetaAcceso>
  )
}
