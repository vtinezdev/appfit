import { useState } from 'react'
import { formatNumber } from '../../../shared/lib/format'
import { useLiveQuery } from 'dexie-react-hooks'
import * as exercisesRepo from '../data/exercisesRepo'
import * as setsRepo from '../data/setsRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import type { Workout } from '../../../shared/db/types'
import { volumenSets } from '../lib/workout'
import Sheet from '../../../shared/components/Sheet'
import ListRow from '../../../shared/components/ListRow'
import { EmptyState } from '../../../shared/components/StateMessage'

function formatFechaHora(ts: number): string {
  return new Date(ts).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function formatDuracion(inicio: number, fin: number): string {
  const min = Math.round((fin - inicio) / 60000)
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)} h ${min % 60} min`
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
    <div className="space-y-2 pb-4">
      {lista.length === 0 && <EmptyState>Todavía no has completado ningún entreno.</EmptyState>}
      {lista.map((w) => (
        <ListRow key={w.id} onClick={() => setSeleccionado(w)}>
          <p className="font-medium text-fg">{formatFechaHora(w.inicio)}</p>
          <p className="text-caption text-fg-subtle">{w.fin ? formatDuracion(w.inicio, w.fin) : '—'}</p>
        </ListRow>
      ))}

      <Sheet open={seleccionado !== null} onClose={() => setSeleccionado(null)} title={seleccionado ? formatFechaHora(seleccionado.inicio) : ''}>
        <div className="space-y-3">
          {Array.from(porEjercicio.entries()).map(([exId, sets]) => (
            <div key={exId}>
              <p className="mb-1 text-body-sm font-medium text-fg">{exerciseMap.get(exId)?.nombre ?? '…'}</p>
              <div className="space-y-0.5 text-body-sm text-fg-muted">
                {sets
                  ?.sort((a, b) => a.orden - b.orden)
                  .map((s) => (
                    <p key={s.id}>
                      {s.reps} reps × {s.peso} kg
                    </p>
                  ))}
                <p className="text-caption text-fg-subtle">Volumen: {formatNumber(volumenSets(sets ?? []), 1)} kg</p>
              </div>
            </div>
          ))}
          {porEjercicio.size === 0 && <EmptyState>Sin ejercicios registrados.</EmptyState>}
        </div>
      </Sheet>
    </div>
  )
}
