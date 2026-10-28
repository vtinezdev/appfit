import ProgressBar from '../../../shared/components/ProgressBar'
import { formatInt } from '../../../shared/lib/format'
import { useVitrina } from '../../vitrina/hooks/useVitrina'
import { metasEnCurso, textoPlazo } from '../../vitrina/lib/metas'
import TarjetaAcceso from './TarjetaAcceso'

/**
 * Metas en Inicio (punto 18): solo si hay alguna en curso, la más cerca de cumplirse con su barra y su plazo, y cuántas
 * más hay. Sin metas no sale (Inicio no empuja a crearlas). Toda la tarjeta lleva a Progreso, donde viven las metas.
 */
export default function AccesoMetas({ hoy, onAbrir }: { hoy: string; onAbrir: () => void }) {
  const estado = useVitrina(hoy)
  if (!estado?.visible) return null
  const [destacada, ...resto] = metasEnCurso(estado.metas)
  if (!destacada) return null
  const plazo = textoPlazo(destacada)
  return <TarjetaAcceso etiqueta="Metas" onAbrir={onAbrir}>
    <span className="flex flex-wrap items-baseline justify-between gap-x-3">
      <span className="min-w-0 break-words text-title text-fg">{destacada.titulo}</span>
      <span className="tabular text-body-sm text-fg-muted">{destacada.detalle}</span>
    </span>
    <ProgressBar value={destacada.progreso} goal={destacada.objetivo} label={destacada.titulo} valueText={destacada.detalle} colorClass="bg-accent-strong" />
    {(plazo || resto.length > 0) && <span className="tabular block text-caption text-fg-muted">
      {[plazo, resto.length > 0 ? `y ${formatInt(resto.length)} ${resto.length === 1 ? 'meta más' : 'metas más'}` : null].filter(Boolean).join(' · ')}
    </span>}
  </TarjetaAcceso>
}
