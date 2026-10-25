import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import * as exercisesRepo from '../data/exercisesRepo'
import * as routinesRepo from '../data/routinesRepo'
import * as setsRepo from '../data/setsRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import Icon from '../../../shared/components/Icon'
import ListRow from '../../../shared/components/ListRow'
import Sheet from '../../../shared/components/Sheet'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import type { SetEntry } from '../../../shared/db/types'
import { formatFechaHora } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import { ejerciciosDelEntreno } from '../lib/repetirEntreno'

interface Props {
  open: boolean
  onClose: () => void
  /** El entreno nuevo ya está creado: abre la sesión. */
  onRepetido: () => void
}

/** Elegir un entreno terminado (por su día) para empezar otro igual: mismos ejercicios, series y cifras. */
export default function RepetirEntreno({ open, onClose, onRepetido }: Props) {
  const [repitiendo, setRepitiendo] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const datos = useLiveQuery(async () => {
    const porWorkout = new Map<number, SetEntry[]>()
    for (const s of await setsRepo.todas()) {
      const del = porWorkout.get(s.workoutId)
      if (del) del.push(s)
      else porWorkout.set(s.workoutId, [s])
    }
    return {
      workouts: (await workoutsRepo.terminados()).filter(w => porWorkout.has(w.id)),
      porWorkout,
      rutinas: new Map((await routinesRepo.listar()).map(r => [r.id, r.nombre])),
      nombres: new Map((await exercisesRepo.listar()).map(e => [e.id, e.nombre])),
    }
  }, [])

  async function repetir(id: number) {
    if (repitiendo !== null) return
    setRepitiendo(id)
    setError(null)
    try {
      await workoutsRepo.repetir(id)
      onClose()
      onRepetido()
    } catch {
      setError('No se ha podido empezar el entreno. Inténtalo de nuevo.')
    } finally {
      setRepitiendo(null)
    }
  }

  return <Sheet open={open} onClose={onClose} title="Repetir un entreno">
    <div className="space-y-stack">
      <p className="break-words text-body-sm text-fg-muted">Elige el día: empiezas un entreno con sus mismos ejercicios, series y cifras, sin marcar.</p>
      {error && <ErrorState>{error}</ErrorState>}
      {datos === undefined ? <LoadingState /> : datos.workouts.length === 0 ? <EmptyState>Aún no hay entrenos terminados con series.</EmptyState> : (
        <ul className="divide-y divide-line" aria-label="Entrenos terminados">
          {datos.workouts.map(w => {
            const sets = datos.porWorkout.get(w.id) ?? []
            const ids = ejerciciosDelEntreno(w, sets)
            const titulo = (w.routineId !== undefined ? datos.rutinas.get(w.routineId) : undefined) ?? 'Entreno libre'
            const nombres = ids.map(id => datos.nombres.get(id)).filter(Boolean).slice(0, 3).join(' · ')
            return <li key={w.id}>
              <ListRow tone="muted" disabled={repitiendo !== null} aria-label={`Repetir el entreno del ${formatFechaHora(w.inicio)}: ${titulo}`} onClick={() => repetir(w.id)}>
                <span className="min-w-0 flex-1">
                  <span className="tabular block break-words text-body font-medium text-fg">{formatFechaHora(w.inicio)} · {titulo}</span>
                  <span className="block break-words text-caption text-fg-muted">{formatInt(ids.length)} {ids.length === 1 ? 'ejercicio' : 'ejercicios'}{nombres ? ` · ${nombres}` : ''}</span>
                </span>
                <Icon name="chevron-right" size={18} className="text-fg-subtle" />
              </ListRow>
            </li>
          })}
        </ul>
      )}
    </div>
  </Sheet>
}
