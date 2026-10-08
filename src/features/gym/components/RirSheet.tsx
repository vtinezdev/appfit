import { useState } from 'react'
import Button from '../../../shared/components/Button'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'

const OPCIONES: { valor: number; label: string; detalle: string }[] = [
  { valor: 0, label: '0', detalle: 'Al fallo' }, { valor: 1, label: '1', detalle: '1 más' }, { valor: 2, label: '2', detalle: '2 más' },
  { valor: 3, label: '3', detalle: '3 más' }, { valor: 4, label: '4', detalle: '4 más' }, { valor: 5, label: '5+', detalle: '5 o más' },
]

/** Una elección de dos toques: 0 y «sin dato» son estados distintos y visibles. */
export default function RirSheet({ open, titulo, valor, alCompletar, onElegir, onClose }: {
  open: boolean; titulo: string; valor?: number; alCompletar?: boolean
  onElegir: (valor: number | undefined) => Promise<void>; onClose: () => void
}) {
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function elegir(v: number | undefined) {
    if (ocupado) return
    setOcupado(true); setError(null)
    try { await onElegir(v); onClose() } catch { setError('No se ha podido guardar el RIR. Inténtalo de nuevo.') } finally { setOcupado(false) }
  }
  return (
    <Sheet open={open} onClose={() => { if (!ocupado) { setError(null); onClose() } }} title={titulo}>
      <div className="space-y-4">
        <p className="text-body-sm text-fg-muted">¿Cuántas repeticiones más podías hacer?</p>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Repeticiones en reserva">
          {OPCIONES.map(o => (
            <button key={o.valor} type="button" aria-pressed={valor === o.valor} aria-label={`RIR ${o.label}: ${o.detalle}`} disabled={ocupado} onClick={() => elegir(o.valor)}
              className={`app-button grid min-h-touch-lg place-items-center content-center rounded-md border px-1 py-2 transition-colors duration-short disabled:opacity-40 ${valor === o.valor ? 'border-accent bg-selected text-selected-on' : 'border-line-strong/50 text-fg hover:bg-surface-muted'}`}>
              <span className="font-numeric text-title tabular">{o.label}</span>
              <span className={`text-caption ${valor === o.valor ? 'text-selected-on' : 'text-fg-muted'}`}>{o.detalle}</span>
            </button>
          ))}
        </div>
        {valor !== undefined && <Button variant="ghost" block disabled={ocupado} onClick={() => elegir(undefined)}>Quitar RIR</Button>}
        {alCompletar && <p className="text-caption text-fg-muted">Se abre al completar cada serie. Puedes desactivarlo en Ajustes › Entreno.</p>}
        {error && <ErrorState>{error}</ErrorState>}
      </div>
    </Sheet>
  )
}
