import { useState } from 'react'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import { metrosTexto, type Expedicion } from '../lib/cumbres'
import type { Montana } from '../lib/montanas'
import ListaMontanas from './ListaMontanas'

interface Props {
  open: boolean
  onClose: () => void
  actual: Expedicion
  opciones: readonly Montana[]
  /** Guarda el cambio; si falla, el error se muestra en la hoja. */
  onElegir: (m: Montana) => Promise<void>
}

/** Cambiar la montaña actual por otra sin coronar y más alta que lo ya subido, que se conserva. */
export default function CambiarMontanaSheet({ open, onClose, actual, opciones, onElegir }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function elegir(m: Montana) {
    setGuardando(true)
    setError(null)
    try {
      await onElegir(m)
    } catch {
      setError('No se ha podido cambiar la montaña. Inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return <Sheet open={open} onClose={onClose} title="Cambiar montaña">
    <div className="space-y-stack">
      <p className="break-words text-body-sm text-fg-muted">
        {actual.metros > 0 ? `Conservas los ${metrosTexto(actual.metros)} subidos en el ${actual.montana.nombre}. ` : ''}Solo aparecen las montañas sin coronar{actual.metros > 0 ? ' más altas que eso' : ''}.
      </p>
      {error && <ErrorState>{error}</ErrorState>}
      {opciones.length === 0
        ? <p className="text-body-sm text-fg-muted">No queda otra montaña por la que cambiarla.</p>
        : <ul className="space-y-2" aria-label="Montañas"><ListaMontanas montanas={opciones} onElegir={elegir} tone="muted" disabled={guardando} /></ul>}
    </div>
  </Sheet>
}
