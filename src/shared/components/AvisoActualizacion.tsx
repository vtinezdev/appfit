import Icon from './Icon'
import { useActualizaciones } from '../pwa/useActualizaciones'
import { textoActualizacion } from '../pwa/version'

/**
 * Estado de las actualizaciones como botón redondo en la cabecera de Inicio: ✓ al día, descarga con un punto de acento
 * si hay una pendiente, «i» en lo demás. Abre la explicación; no interrumpe lo que se esté registrando.
 */
export default function AvisoActualizacion({ onRevisar }: { onRevisar: () => void }) {
  const estado = useActualizaciones()
  const texto = textoActualizacion(estado)
  return <button type="button" onClick={onRevisar} aria-label={`Actualizaciones. ${texto}`} title={texto}
    className="app-button relative inline-flex h-touch w-touch shrink-0 items-center justify-center rounded-pill border border-line/60 bg-surface text-fg-muted shadow-control hover:bg-surface-muted enabled:active:opacity-70">
    <Icon name={estado.hayActualizacion ? 'download' : estado.fase === 'al-dia' ? 'check' : 'info'} size={20} />
    {estado.hayActualizacion && <span aria-hidden className="absolute right-2 top-2 h-2.5 w-2.5 rounded-pill bg-accent ring-2 ring-surface" />}
  </button>
}
