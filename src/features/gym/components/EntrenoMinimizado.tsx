import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Workout } from '../../../shared/db/types'
import { getSettings } from '../../../shared/db/settings'
import Icon from '../../../shared/components/Icon'
import { formatInt } from '../../../shared/lib/format'
import { pitar } from '../../../shared/lib/sonido'
import { haptic } from '../../../shared/design/motion'
import * as routinesRepo from '../data/routinesRepo'
import * as setsRepo from '../data/setsRepo'
import { readSession, seriesMarcadas, writeSession } from '../lib/session'
import ProgresoSeries from './ProgresoSeries'
import { RestCountdown, WorkoutClock } from './WorkoutClock'

/**
 * Entreno en curso fuera de su pantalla: una barra de grafito sobre la navegación con la rutina, el tiempo (o el
 * descanso que queda) y las series marcadas. Tocarla vuelve al entreno. Mientras está minimizado, el descanso sigue
 * contando aquí y avisa al terminar, como la píldora del entreno.
 */
export default function EntrenoMinimizado({ workout, onAbrir }: { workout: Workout; onAbrir: () => void }) {
  // Al minimizar, EntrenoActivo ya ha dejado su estado en sessionStorage: se lee una vez al montar.
  const [session, setSession] = useState(() => readSession(workout.id))
  const sets = useLiveQuery(() => setsRepo.delWorkout(workout.id), [workout.id]) ?? []
  const nombre = useLiveQuery(async () => (workout.routineId ? (await routinesRepo.obtener(workout.routineId))?.nombre : undefined) ?? 'Entreno libre', [workout.routineId])
  const ajustes = useLiveQuery(() => getSettings(), [])
  const hechas = seriesMarcadas(sets, session.completed).length

  function finDescanso() {
    const siguiente = { ...session, restEndsAt: null }
    writeSession(workout.id, siguiente)
    setSession(siguiente)
    haptic('success')
    if (ajustes?.sonidoDescanso !== false) pitar()
  }

  return (
    <button type="button" className="entreno-minimizado training-surface app-button" onClick={() => { haptic(); onAbrir() }}
      aria-label={`Volver al entreno: ${nombre ?? 'Entreno'}, ${hechas} de ${sets.length} series`}>
      <span className="flex items-center gap-3">
        <Icon name="dumbbell" size={20} className="training-muted shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body font-semibold">{nombre ?? 'Entreno'}</span>
          <span className="training-muted tabular block truncate text-caption">
            {session.restEndsAt !== null
              ? <>Descanso <RestCountdown endsAt={session.restEndsAt} onEnd={finDescanso} /></>
              : <WorkoutClock start={workout.inicio} />}
            {' · '}{formatInt(hechas)}/{formatInt(sets.length)} series
          </span>
        </span>
        <Icon name="chevron-up" size={20} className="training-muted shrink-0" />
      </span>
      <ProgresoSeries hechas={hechas} total={sets.length} />
    </button>
  )
}
