import { useState } from 'react'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import { formatInt } from '../../../shared/lib/format'
import { kmTexto } from '../../actividades/lib/actividad'
import { diasDeExpedicion, nombreExpedicion, type Expedicion } from '../lib/caminos'
import { metrosRuta } from '../lib/rutas'

interface Props {
  llegada: Expedicion
  /** La ruta que sigue si no se elige otra (la sugerida), con lo que ya lleva. */
  sugerida: Expedicion
  open: boolean
  onClose: () => void
  onExited?: () => void
  /** Lleva a Caminos con la lista de rutas abierta. */
  onElegir: () => void
  /** Se queda con la sugerida; si falla, el error sale en la hoja. */
  onSeguir: () => Promise<void>
}

/**
 * Al llegar al final de una ruta (punto 4), en la pantalla en la que se esté: la llegada con sus cifras y qué hacer
 * después, elegir la próxima ruta (Caminos, con la lista abierta) o seguir con la sugerida. Los km que llevas desde la
 * llegada cuentan para la que elijas. Cerrar es «Más tarde»: la tarjeta de Caminos sigue preguntando.
 */
export default function LlegadaRutaSheet({ llegada, sugerida, open, onClose, onExited, onElegir, onSeguir }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const dias = diasDeExpedicion(llegada)

  async function seguir() {
    setGuardando(true)
    setError(null)
    try {
      await onSeguir()
    } catch {
      setError('No se ha podido guardar la ruta. Inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return <Sheet open={open} onClose={onClose} onExited={onExited} title={`Has llegado a ${llegada.ruta.etapas.at(-1)?.hasta ?? llegada.ruta.nombre}`}
    footer={<div className="space-y-2">
      {error && <ErrorState>{error}</ErrorState>}
      <Button block size="lg" onClick={onElegir}>Elegir próxima ruta</Button>
      <Button block variant="secondary" loading={guardando} onClick={() => { void seguir() }}>Seguir con {sugerida.ruta.nombre}</Button>
    </div>}>
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <span aria-hidden className="flex h-16 w-16 items-center justify-center rounded-lg bg-accent text-accent-on"><Icon name="flag" size={32} /></span>
        <p className="break-words text-title text-fg">{nombreExpedicion(llegada)}</p>
        <p className="tabular break-words text-body-sm text-fg-muted">
          {kmTexto(metrosRuta(llegada.ruta))}{dias !== null ? ` en ${dias === 1 ? '1 día' : `${formatInt(dias)} días`}` : ''} · {llegada.sellos.length === 1 ? '1 sello' : `${formatInt(llegada.sellos.length)} sellos`}
        </p>
      </div>
      <p className="break-words text-body-sm text-fg-muted">
        Elige tu próxima ruta o crea la tuya. {sugerida.metros > 0 ? `Los ${kmTexto(sugerida.metros)} que llevas desde la llegada cuentan para la que elijas.` : 'Empiezas con lo que andes desde ahora.'}
      </p>
    </div>
  </Sheet>
}
