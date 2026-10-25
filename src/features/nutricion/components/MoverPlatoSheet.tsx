import { useState } from 'react'
import type { Comida } from '../../../shared/db/types'
import Sheet from '../../../shared/components/Sheet'
import Button from '../../../shared/components/Button'
import { ErrorState } from '../../../shared/components/StateMessage'
import type { Plato } from '../lib/platos'
import { COMIDAS } from '../lib/comidas'

interface Props {
  plato: Plato | null
  moviendo: boolean
  error: string | null
  onMover: (plato: Plato, destino: Comida) => Promise<boolean>
  onClose: () => void
}

/** La misma operación de datos que el arrastre, disponible sin realizar un gesto. */
export default function MoverPlatoSheet({ plato, moviendo, error, onMover, onClose }: Props) {
  const [cerrando, setCerrando] = useState(false)
  return <Sheet open={plato !== null && !cerrando} title="Mover plato" onClose={() => setCerrando(true)} onExited={() => { setCerrando(false); onClose() }}>
    <div className="space-y-3">
      <p className="break-words text-body font-semibold text-fg">{plato?.nombre}</p>
      <p className="text-body-sm text-fg-muted">Elige otra comida de este día. Se moverán todos sus ingredientes.</p>
      {error && <ErrorState>{error}</ErrorState>}
      <div className="space-y-2">
        {COMIDAS.map(c => <Button key={c.valor} variant="secondary" block disabled={moviendo || c.valor === plato?.entries[0].comida}
          aria-label={`Mover a ${c.label}`} onClick={async () => { if (plato && await onMover(plato, c.valor)) setCerrando(true) }}>
          {c.label}{c.valor === plato?.entries[0].comida && <span className="text-caption text-fg-muted">Actual</span>}
        </Button>)}
      </div>
      {moviendo && <p role="status" className="text-body-sm text-fg-muted">Moviendo plato…</p>}
      <p className="text-caption text-fg-muted">También puedes desplegar sus ingredientes y arrastrarlo desde el asa del plato en el diario.</p>
    </div>
  </Sheet>
}
