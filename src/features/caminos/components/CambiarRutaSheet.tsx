import { useState } from 'react'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
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
  /** Tras una llegada (punto 4): «Elige tu próxima ruta», con lo que sobró, y el acceso al creador de rutas. */
  llegada?: { onCrear: () => void }
}

/**
 * Cambiar la ruta actual por otra más larga que lo ya recorrido, que se conserva; también una ya hecha o una propia. Tras
 * una llegada, la misma hoja sirve para elegir la próxima, con un acceso a crear una ruta propia.
 */
export default function CambiarRutaSheet({ open, onClose, actual, opciones, veces, onElegir, llegada }: Props) {
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

  return <Sheet open={open} onClose={onClose} title={llegada ? 'Elige tu próxima ruta' : 'Cambiar de ruta'}>
    <div className="space-y-stack">
      <p className="break-words text-body-sm text-fg-muted">
        {llegada
          ? `${actual.metros > 0 ? `Los ${kmTexto(actual.metros)} que llevas desde la llegada cuentan para la que elijas. ` : ''}Puedes repetir una que ya hayas hecho o crear la tuya.`
          : `${actual.metros > 0 ? `Conservas los ${kmTexto(actual.metros)} recorridos en ${actual.ruta.nombre}: aparecen las rutas más largas que eso. ` : ''}Puedes repetir una que ya hayas hecho.`}
      </p>
      {llegada && <Button variant="secondary" block onClick={llegada.onCrear}><Icon name="route" size={18} />Crear una ruta</Button>}
      {error && <ErrorState>{error}</ErrorState>}
      {opciones.length === 0
        ? <p className="text-body-sm text-fg-muted">No queda otra ruta por la que cambiarla.</p>
        : <ul className="space-y-2" aria-label="Rutas"><ListaRutas rutas={opciones} veces={veces} onElegir={elegir} tone="muted" disabled={guardando} /></ul>}
    </div>
  </Sheet>
}
