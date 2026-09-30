import { useState } from 'react'
import { formatNumber } from '../../../shared/lib/format'
import { useLiveQuery } from 'dexie-react-hooks'
import * as exercisesRepo from '../data/exercisesRepo'
import * as setsRepo from '../data/setsRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import type { Workout } from '../../../shared/db/types'
import { formatDuracion, volumenSets } from '../lib/workout'
import Sheet from '../../../shared/components/Sheet'
import Icon from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import ListRow from '../../../shared/components/ListRow'
import { EmptyState } from '../../../shared/components/StateMessage'

function formatFechaHora(ts: number): string {
  return new Date(ts).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function Historial() {
  const [seleccionado, setSeleccionado] = useState<Workout | null>(null)
  const workouts = useLiveQuery(() => workoutsRepo.terminados(), [])
  const detalleSets = useLiveQuery(() => (seleccionado?.id ? setsRepo.delWorkout(seleccionado.id) : []), [seleccionado?.id])
  const exercises = useLiveQuery(() => exercisesRepo.listar(), [])
  const exerciseMap = new Map((exercises ?? []).map((e) => [e.id!, e]))

  const lista = workouts ? [...workouts].reverse() : []

  const porEjercicio = new Map<number, typeof detalleSets>()
  for (const s of detalleSets ?? []) {
    const arr = porEjercicio.get(s.exerciseId) ?? []
    arr.push(s)
    porEjercicio.set(s.exerciseId, arr)
  }

  return (
    <div className="space-y-stack">
      {lista.length === 0 && <EmptyState icon="dumbbell" title="Sin entrenos todavía">Cuando termines un entreno aparecerá aquí.</EmptyState>}
      {lista.length > 0 && (
        <ListGroup aria-label="Entrenos terminados">
          {lista.map((w) => (
            <li key={w.id}>
              <ListRow onClick={() => setSeleccionado(w)}>
                <span className="min-w-0">
                  <span className="block text-body-sm font-medium text-fg">{formatFechaHora(w.inicio)}</span>
                  <span className="tabular block text-caption text-fg-muted">{w.fin ? formatDuracion(w.fin - w.inicio) : '—'}</span>
                </span>
                <Icon name="chevron-right" size={18} className="text-fg-subtle" />
              </ListRow>
            </li>
          ))}
        </ListGroup>
      )}

      <Sheet open={seleccionado !== null} onClose={() => setSeleccionado(null)} title={seleccionado ? formatFechaHora(seleccionado.inicio) : ''}>
        <div className="space-y-section">
          {Array.from(porEjercicio.entries()).map(([exId, sets]) => (
            <section key={exId} aria-label={exerciseMap.get(exId)?.nombre ?? 'Ejercicio'} className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-title text-fg">{exerciseMap.get(exId)?.nombre ?? '…'}</h3>
                <span className="tabular text-caption text-fg-muted">{formatNumber(volumenSets(sets ?? []), 1)} kg</span>
              </div>
              <table className="tabular w-full text-body-sm">
                <thead>
                  <tr className="text-left text-label uppercase text-fg-subtle">
                    <th className="w-16 pb-1 font-semibold">Serie</th>
                    <th className="pb-1 text-right font-semibold">Reps</th>
                    <th className="pb-1 text-right font-semibold">Kg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {[...(sets ?? [])]
                    .sort((a, b) => a.orden - b.orden)
                    .map((s, i) => (
                      <tr key={s.id}>
                        <td className="py-1.5 text-fg-muted">{i + 1}</td>
                        <td className="py-1.5 text-right text-fg">{formatNumber(s.reps, 0)}</td>
                        <td className="py-1.5 text-right font-semibold text-fg">{formatNumber(s.peso, 2)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </section>
          ))}
          {porEjercicio.size === 0 && <EmptyState>Sin ejercicios registrados.</EmptyState>}
        </div>
      </Sheet>
    </div>
  )
}
