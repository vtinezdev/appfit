import { useLiveQuery } from 'dexie-react-hooks'
import Sheet from '../../../shared/components/Sheet'
import Metric from '../../../shared/components/Metric'
import { EmptyState, LoadingState } from '../../../shared/components/StateMessage'
import { parseISODate, todayISO } from '../../../shared/lib/dates'
import { formatNumber } from '../../../shared/lib/format'
import * as pesosRepo from '../data/pesosRepo'

/** Consulta todos los pesajes existentes; no escribe ni incorpora un nuevo modelo. */
export default function HistorialPeso({ onClose }: { onClose: () => void }) {
  const pesos = useLiveQuery(() => pesosRepo.delRango('0000-01-01', todayISO()), [])
  const lista = pesos ? [...pesos].reverse() : []
  return (
    <Sheet open title="Historial de peso" onClose={onClose}>
      {!pesos ? <LoadingState /> : !lista.length ? <EmptyState title="Tu primer pesaje">Registra el peso desde Inicio. Aquí podrás consultar cada fecha.</EmptyState> : (
        <div className="space-y-5">
          <Metric size="hero" label="Último registro" valor={formatNumber(lista[0].kg, 1)} unidad="kg" />
          <ul className="divide-y divide-line" aria-label="Pesajes registrados">
            {lista.map(p => <li key={p.id} className="flex items-baseline justify-between gap-3 py-3">
              <time dateTime={p.fecha} className="text-body-sm text-fg-muted">{parseISODate(p.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</time>
              <span className="tabular text-body font-semibold text-fg">{formatNumber(p.kg, 1)} <span className="font-normal text-fg-muted">kg</span></span>
            </li>)}
          </ul>
        </div>
      )}
    </Sheet>
  )
}
