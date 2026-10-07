import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import ResumenSemanalGym from '../components/ResumenSemanalGym'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import * as workoutsRepo from '../data/workoutsRepo'
import { formatDuracion } from '../lib/workout'
import Icon from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import ListRow from '../../../shared/components/ListRow'
import { EmptyState, LoadingState } from '../../../shared/components/StateMessage'

function formatFechaHora(ts: number): string {
  return new Date(ts).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/** Lista de entrenos terminados; el detalle y la edición viven en `DetalleEntreno`. */
export default function Historial({ onAbrir }: { onAbrir: (id: number) => void }) {
  const [modo, setModo] = useState<'sesiones' | 'semanas'>('sesiones')
  const workouts = useLiveQuery(() => workoutsRepo.terminados(), [])
  const lista = workouts ? [...workouts].reverse() : []

  return (
    <div className="space-y-stack">
      <SegmentedControl label="Ver historial por" size="sm" valor={modo} onChange={setModo} opciones={[{ valor: 'sesiones', label: 'Sesiones' }, { valor: 'semanas', label: 'Semanas' }]} />
      {modo === 'semanas' && <ResumenSemanalGym />}
      {modo === 'sesiones' && workouts === undefined && <LoadingState />}
      {modo === 'sesiones' && workouts && lista.length === 0 && <EmptyState icon="dumbbell" title="Sin entrenos todavía">Cuando termines un entreno aparecerá aquí.</EmptyState>}
      {modo === 'sesiones' && lista.length > 0 && (
        <ListGroup aria-label="Entrenos terminados">
          {lista.map((w) => (
            <li key={w.id}>
              <ListRow onClick={() => onAbrir(w.id)}>
                <span className="min-w-0">
                  <span className="block text-body font-medium text-fg">{formatFechaHora(w.inicio)}</span>
                  <span className="tabular block text-caption text-fg-muted">{w.fin ? formatDuracion(w.fin - w.inicio) : '—'}{w.notas ? ' · con notas' : ''}</span>
                </span>
                <Icon name="chevron-right" size={18} className="text-fg-subtle" />
              </ListRow>
            </li>
          ))}
        </ListGroup>
      )}
    </div>
  )
}
