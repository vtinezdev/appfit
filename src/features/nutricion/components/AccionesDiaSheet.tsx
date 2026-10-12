import Sheet from '../../../shared/components/Sheet'
import { todayISO } from '../../../shared/lib/dates'
import { copiaEsNoOp } from '../lib/plantillas'
import { Input } from '../../../shared/components/Input'
import Button from '../../../shared/components/Button'
import ListRow from '../../../shared/components/ListRow'
import { ErrorState } from '../../../shared/components/StateMessage'

export type PasoAccionesDia = 'menu' | 'copiar'

interface Props {
  open: boolean
  paso: PasoAccionesDia
  fechaOrigen: string
  fechaDestino: string
  /** El día ya está marcado como cheat day. */
  cheat: boolean
  onFechaDestinoChange: (fecha: string) => void
  onIrACopiar: () => void
  onCopiar: () => void
  /** Marca o quita el cheat day según `cheat`. */
  onCheat: () => void
  onClose: () => void
  copiando?: boolean
  marcando?: boolean
  error?: string | null
}

/**
 * «⋯» de la cabecera de fecha en Hoy: acciones del día entero. «Copiar el día…» (todas las comidas a otra fecha,
 * conservando cada una) y marcar o quitar el cheat day.
 */
export default function AccionesDiaSheet({ open, paso, fechaOrigen, fechaDestino, cheat, onFechaDestinoChange, onIrACopiar, onCopiar, onCheat, onClose, copiando = false, marcando = false, error }: Props) {
  const noOp = copiaEsNoOp({ fecha: fechaOrigen }, { fecha: fechaDestino })
  const copiar = paso === 'copiar'
  return (
    <Sheet open={open} onClose={onClose} title={copiar ? 'Copiar el día a…' : 'Acciones del día'} footer={copiar && <div className="space-y-2">
      {error && <ErrorState>{error}</ErrorState>}
      <Button block loading={copiando} onClick={onCopiar} disabled={!fechaDestino || fechaDestino > todayISO() || noOp || copiando}>
        {copiando ? 'Copiando…' : 'Copiar'}
      </Button>
    </div>}>
      {copiar ? (
        <div className="space-y-3">
          <label className="block space-y-1"><span className="text-label text-fg-muted">Fecha de destino</span><Input
            type="date"
            value={fechaDestino}
            max={todayISO()}
            onChange={(e) => onFechaDestinoChange(e.target.value)}
          /></label>
          {noOp && <p className="text-body-sm text-warning">El destino no puede ser el mismo día.</p>}
        </div>
      ) : (
        <div className="space-y-2">
          <ListRow tone="muted" onClick={onIrACopiar} className="font-medium">Copiar el día…</ListRow>
          <ListRow tone="muted" onClick={onCheat} disabled={marcando} aria-busy={marcando}>
            <span className="min-w-0 space-y-0.5">
              <span className="block font-medium">{cheat ? 'Quitar cheat day' : 'Marcar como cheat day'}</span>
              <span className="block text-caption text-fg-muted">Fuera de las medias y de la adherencia; no rompe la racha.</span>
            </span>
          </ListRow>
          {error && <ErrorState>{error}</ErrorState>}
        </div>
      )}
    </Sheet>
  )
}
