import { useState } from 'react'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import { kmTexto } from '../../actividades/lib/actividad'
import type { Expedicion } from '../lib/caminos'
import type { Ruta } from '../lib/rutas'
import ListaRutas from './ListaRutas'

interface Props {
  open: boolean
  onClose: () => void
  actual: Expedicion
  opciones: readonly Ruta[]
  veces: ReadonlyMap<string, number>
  /** Guarda el cambio; si falla, el error se muestra en la hoja. */
  onElegir: (r: Ruta) => Promise<void>
}

/** Cambiar la ruta actual por otra más larga que lo ya recorrido, que se conserva; también una ya hecha o una propia. */
export default function CambiarRutaSheet({ open, onClose, actual, opciones, veces, onElegir }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function elegir(r: Ruta) {
    setGuardando(true)
    setError(null)
    try {
      await onElegir(r)
    } catch {
      setError('No se ha podido cambiar de ruta. Inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return <Sheet open={open} onClose={onClose} title="Cambiar de ruta">
    <div className="space-y-stack">
      <p className="break-words text-body-sm text-fg-muted">
        {actual.metros > 0 ? `Conservas los ${kmTexto(actual.metros)} recorridos en ${actual.ruta.nombre}: aparecen las rutas más largas que eso. ` : ''}Puedes repetir una que ya hayas hecho.
      </p>
      {error && <ErrorState>{error}</ErrorState>}
      {opciones.length === 0
        ? <p className="text-body-sm text-fg-muted">No queda otra ruta por la que cambiarla.</p>
        : <ul className="space-y-2" aria-label="Rutas"><ListaRutas rutas={opciones} veces={veces} onElegir={elegir} tone="muted" disabled={guardando} /></ul>}
    </div>
  </Sheet>
}
