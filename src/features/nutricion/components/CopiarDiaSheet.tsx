import Sheet from '../../../shared/components/Sheet'
import { todayISO } from '../../../shared/lib/dates'
import { copiaEsNoOp } from '../lib/plantillas'
import { Input } from '../../../shared/components/Input'
import Button from '../../../shared/components/Button'

interface Props {
  open: boolean
  fechaOrigen: string
  fechaDestino: string
  onFechaDestinoChange: (fecha: string) => void
  onCopiar: () => void
  onClose: () => void
  copiando?: boolean
}

/** «⋯» de la cabecera de fecha en Hoy (A2): copia todas las comidas del día, conservando cada una. */
export default function CopiarDiaSheet({ open, fechaOrigen, fechaDestino, onFechaDestinoChange, onCopiar, onClose, copiando = false }: Props) {
  const noOp = copiaEsNoOp({ fecha: fechaOrigen }, { fecha: fechaDestino })
  return (
    <Sheet open={open} onClose={onClose} title="Copiar el día a…">
      <div className="space-y-3">
        <Input
          type="date"
          value={fechaDestino}
          max={todayISO()}
          onChange={(e) => onFechaDestinoChange(e.target.value)}
        />
        {noOp && <p className="text-body-sm text-warning">El destino no puede ser el mismo día.</p>}
        <Button block
          onClick={onCopiar}
          disabled={!fechaDestino || fechaDestino > todayISO() || noOp || copiando}
        >
          {copiando ? 'Copiando…' : 'Copiar'}
        </Button>
      </div>
    </Sheet>
  )
}
