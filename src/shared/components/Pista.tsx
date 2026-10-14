import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings, updateSettings } from '../db/settings'
import { marcarPistaVista, pistaPendiente, PISTAS, type PistaId } from '../lib/pistas'
import Button from './Button'
import Icon from './Icon'

/**
 * Pista de primera vez (`shared/lib/pistas`): cómo se usa una pantalla, una sola vez. «Entendido» la guarda como vista en
 * los ajustes y no vuelve. Mientras cargan los ajustes no se pinta, para no parpadear a quien ya la cerró.
 */
export default function Pista({ id }: { id: PistaId }) {
  const vistas = useLiveQuery(async () => (await getSettings()).pistasVistas ?? [], [])
  if (vistas === undefined || !pistaPendiente(vistas, id)) return null
  const cerrar = () => {
    // Un fallo al guardar solo hace que la pista vuelva a salir: no merece un error.
    updateSettings({ pistasVistas: marcarPistaVista(vistas, id) }).catch(() => undefined)
  }
  return (
    <aside aria-label="Pista" className="space-y-2 rounded-lg bg-accent-subtle p-card">
      <p className="flex items-start gap-2 text-body-sm text-fg">
        <Icon name="sparkles" size={18} className="mt-0.5 text-accent-strong" />
        <span className="min-w-0">{PISTAS[id]}</span>
      </p>
      <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={cerrar}>Entendido</Button>
      </div>
    </aside>
  )
}
