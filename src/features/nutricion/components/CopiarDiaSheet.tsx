import Sheet from '../../../shared/components/Sheet'
import { todayISO } from '../../../shared/lib/dates'
import { copiaEsNoOp } from '../lib/plantillas'
import { Input } from '../../../shared/components/Input'
import Button from '../../../shared/components/Button'
import { ErrorState } from '../../../shared/components/StateMessage'

interface Props {
  open: boolean
  fechaOrigen: string
  fechaDestino: string
  onFechaDestinoChange: (fecha: string) => void
  onCopiar: () => void
  onClose: () => void
  copiando?: boolean
  error?: string | null
}

/** «⋯» de la cabecera de fecha en Hoy (A2): copia todas las comidas del día, conservando cada una. */
export default function CopiarDiaSheet({ open, fechaOrigen, fechaDestino, onFechaDestinoChange, onCopiar, onClose, copiando = false, error }: Props) {
  const noOp = copiaEsNoOp({ fecha: fechaOrigen }, { fecha: fechaDestino })
  return (
    <Sheet open={open} onClose={onClose} title="Copiar el día a…" footer={<div className="space-y-2">
      {error && <ErrorState>{error}</ErrorState>}
      <Button block loading={copiando} onClick={onCopiar} disabled={!fechaDestino || fechaDestino > todayISO() || noOp || copiando}>
        {copiando ? 'Copiando…' : 'Copiar'}
      </Button>
    </div>}>
      <div className="space-y-3">
        <label className="block space-y-1"><span className="text-label text-fg-muted">Fecha de destino</span><Input
          type="date"
          value={fechaDestino}
          max={todayISO()}
          onChange={(e) => onFechaDestinoChange(e.target.value)}
        /></label>
        {noOp && <p className="text-body-sm text-warning">El destino no puede ser el mismo día.</p>}
      </div>
    </Sheet>
  )
}
