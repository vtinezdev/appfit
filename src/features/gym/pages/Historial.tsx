import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import ResumenSemanalGym from '../components/ResumenSemanalGym'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import * as routinesRepo from '../data/routinesRepo'
import * as setsRepo from '../data/setsRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import { detalleSesion } from '../lib/workout'
import { formatFechaHora } from '../../../shared/lib/dates'
import type { SetEntry } from '../../../shared/db/types'
import Icon from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import ListRow from '../../../shared/components/ListRow'
import { EmptyState, LoadingState } from '../../../shared/components/StateMessage'

/** Lista de entrenos terminados con su rutina, duración y volumen; el detalle y la edición viven en `DetalleEntreno`. */
export default function Historial({ onAbrir }: { onAbrir: (id: number) => void }) {
  const [modo, setModo] = useState<'sesiones' | 'semanas'>('sesiones')
  const workouts = useLiveQuery(() => workoutsRepo.terminados(), [])
  const contexto = useLiveQuery(async () => {
    const porWorkout = new Map<number, SetEntry[]>()
    for (const s of await setsRepo.todas()) {
      const delWorkout = porWorkout.get(s.workoutId)
      if (delWorkout) delWorkout.push(s)
      else porWorkout.set(s.workoutId, [s])
    }
    return { rutinas: new Map((await routinesRepo.listar()).map((r) => [r.id, r.nombre])), porWorkout }
  }, [])
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
                  <span className="tabular block text-body font-medium text-fg">{formatFechaHora(w.inicio)}</span>
                  <span className="tabular block break-words text-caption text-fg-muted">
                    {detalleSesion(w, w.routineId !== undefined ? contexto?.rutinas.get(w.routineId) : undefined, contexto?.porWorkout.get(w.id) ?? [])}
                  </span>
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
