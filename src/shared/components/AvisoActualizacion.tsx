import Icon from './Icon'
import { useActualizaciones } from '../pwa/useActualizaciones'
import { textoActualizacion } from '../pwa/version'

/** Estado pequeño y acceso a la explicación; no interrumpe lo que se esté registrando. */
export default function AvisoActualizacion({ onRevisar }: { onRevisar: () => void }) {
  const estado = useActualizaciones()
  return <button type="button" onClick={onRevisar} aria-label={`Actualizaciones. ${textoActualizacion(estado)}`}
    className="app-button flex min-h-touch w-full items-center gap-2 rounded-md text-left text-caption text-fg-muted">
    <Icon name={estado.hayActualizacion ? 'download' : estado.fase === 'al-dia' ? 'check' : 'info'} size={18} className="shrink-0" />
    <span className="min-w-0 flex-1 break-words">{textoActualizacion(estado)}</span>
    <Icon name="chevron-right" size={16} className="shrink-0" />
  </button>
}
