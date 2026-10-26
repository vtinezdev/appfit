import Icon, { type IconName } from '../../../shared/components/Icon'
import { partesHito, type HitoSesion, type TipoHito } from '../lib/fichaEntreno'

const ICONO: Record<TipoHito, IconName> = { record: 'trophy', cumbre: 'mountain', liga: 'escudo', logro: 'sparkles' }

/**
 * Franja «Hoy» del póster al terminar (ENT-10): hasta tres hitos de la sesión (`lib/fichaEntreno.hitosDeSesion`), cada uno
 * con el icono de su sistema, lo conseguido en grande y de qué en pequeño. Sin animación. `pie`, lo que no cabe, debajo.
 */
export default function HitosSesion({ hitos, pie }: { hitos: HitoSesion[]; pie?: string }) {
  return <section aria-label="Hoy" className="space-y-2">
    <h2 className="training-muted text-rotulo">Hoy</h2>
    <ul className="space-y-2">
      {hitos.map((h, i) => {
        const { principal, detalle } = partesHito(h)
        return <li key={i} className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-on" aria-hidden><Icon name={ICONO[h.tipo]} size={20} /></span>
          <span className="min-w-0">
            <span className="sr-only">{h.etiqueta}: </span>
            <span className="block break-words text-body font-semibold">{principal}</span>
            <span className="training-muted block break-words text-caption">{detalle}</span>
          </span>
        </li>
      })}
    </ul>
    {pie && <p className="training-muted text-caption">{pie}</p>}
  </section>
}
