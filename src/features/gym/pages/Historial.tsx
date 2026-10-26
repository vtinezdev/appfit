import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import CalendarioEntrenos from '../components/CalendarioEntrenos'
import ResumenSemanalGym from '../components/ResumenSemanalGym'
import * as routinesRepo from '../data/routinesRepo'
import * as setsRepo from '../data/setsRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import { calendarioMes, type DiaCalendario } from '../lib/calendarioEntrenos'
import { detalleSesion, formatHora, volumenSets } from '../lib/workout'
import { useNombresGimnasio } from '../hooks/useNombresGimnasio'
import { formatFechaHora, monthDates, todayISO, toISODate } from '../../../shared/lib/dates'
import type { SetEntry } from '../../../shared/db/types'
import Icon from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import ListRow from '../../../shared/components/ListRow'
import SectionHeader from '../../../shared/components/SectionHeader'
import { EmptyState, LoadingState } from '../../../shared/components/StateMessage'

/**
 * Calendario del mes (días entrenados por volumen), resumen de la semana y sesiones del mes, de la más reciente a la
 * más antigua (`workoutsRepo.terminados` ya las da así). El detalle y la edición viven en `DetalleEntreno`.
 */
export default function Historial({ onAbrir }: { onAbrir: (id: number) => void }) {
  const [mes, setMes] = useState(todayISO)
  const workouts = useLiveQuery(() => workoutsRepo.terminados(), [])
  const nombreGimnasio = useNombresGimnasio()
  const contexto = useLiveQuery(async () => {
    const porWorkout = new Map<number, SetEntry[]>()
    for (const s of await setsRepo.todas()) {
      const delWorkout = porWorkout.get(s.workoutId)
      if (delWorkout) delWorkout.push(s)
      else porWorkout.set(s.workoutId, [s])
    }
    return { rutinas: new Map((await routinesRepo.listar()).map((r) => [r.id, r.nombre])), porWorkout }
  }, [])
  if (workouts === undefined) return <LoadingState />
  if (workouts.length === 0) return <EmptyState icon="dumbbell" title="Sin entrenos todavía">Cuando termines un entreno aparecerá aquí.</EmptyState>

  const semanas = calendarioMes(mes, workouts, id => volumenSets(contexto?.porWorkout.get(id) ?? []), todayISO())
  const diasMes = new Set(monthDates(mes))
  const lista = workouts.filter(w => diasMes.has(toISODate(new Date(w.inicio))))

  function abrirDia(dia: DiaCalendario) {
    if (dia.workoutIds.length === 1) return onAbrir(dia.workoutIds[0])
    // Varias sesiones ese día: se baja a la primera de la lista.
    const fila = document.querySelector<HTMLElement>(`[data-sesion="${dia.workoutIds[0]}"] button`)
    fila?.scrollIntoView({ block: 'center' })
    fila?.focus({ preventScroll: true })
  }

  return (
    <div className="space-y-section">
      <CalendarioEntrenos mes={mes} semanas={semanas} onMes={setMes} onDia={abrirDia} />
      <section aria-label="Semana" className="space-y-stack"><SectionHeader variant="section">Semana</SectionHeader><ResumenSemanalGym /></section>
      <section aria-label="Sesiones del mes" className="space-y-stack">
        <SectionHeader variant="section">Sesiones del mes</SectionHeader>
        {lista.length === 0 ? <EmptyState>Sin entrenos este mes.</EmptyState> : (
          <ListGroup aria-label="Entrenos terminados del mes">
            {lista.map((w) => (
              <li key={w.id} data-sesion={w.id}>
                {/* El día en un cuadro (número y día de la semana) y, al lado, la rutina y sus cifras: se lee de un vistazo.
                    El gimnasio, solo si no es el habitual (el de casi todas). */}
                <ListRow onClick={() => onAbrir(w.id)}>
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <span aria-hidden className="flex h-thumb w-thumb shrink-0 flex-col items-center justify-center rounded-md bg-surface-muted">
                      <span className="tabular font-numeric text-title leading-none text-fg">{new Date(w.inicio).getDate()}</span>
                      <span className="text-caption text-fg-muted">{new Date(w.inicio).toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '')}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="sr-only">{formatFechaHora(w.inicio)}: </span>
                      <span className="block break-words text-body font-semibold text-fg">{(w.routineId !== undefined ? contexto?.rutinas.get(w.routineId) : undefined) ?? 'Entreno libre'}</span>
                      <span className="tabular block break-words text-caption text-fg-muted">
                        {formatHora(w.inicio)} · {detalleSesion(w, undefined, contexto?.porWorkout.get(w.id) ?? [], w.gimnasioId !== undefined ? nombreGimnasio(w.gimnasioId) : undefined)}
                      </span>
                    </span>
                  </span>
                  <Icon name="chevron-right" size={18} className="text-fg-subtle" />
                </ListRow>
              </li>
            ))}
          </ListGroup>
        )}
      </section>
    </div>
  )
}
