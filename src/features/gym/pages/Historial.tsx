import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import CalendarioEntrenos from '../components/CalendarioEntrenos'
import DiaSesion from '../components/DiaSesion'
import SemanaGymSheet from '../components/SemanaGymSheet'
import * as exercisesRepo from '../data/exercisesRepo'
import * as routinesRepo from '../data/routinesRepo'
import * as setsRepo from '../data/setsRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import { calendarioMes, type DiaCalendario } from '../lib/calendarioEntrenos'
import { recordsDeEntreno } from '../lib/records'
import { gruposDeSesion } from '../lib/resumenSemanal'
import { detalleSesion, formatDuracion, formatHora, volumenSets } from '../lib/workout'
import { useNombresGimnasio } from '../hooks/useNombresGimnasio'
import { etiquetaPeriodo, formatFechaHora, monthDates, startOfWeek, todayISO, toISODate } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import type { SetEntry, Workout } from '../../../shared/db/types'
import Icon from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import ListRow from '../../../shared/components/ListRow'
import SectionHeader from '../../../shared/components/SectionHeader'
import { EmptyState, LoadingState } from '../../../shared/components/StateMessage'

/**
 * Calendario del mes (días entrenados por volumen) y las sesiones del mes agrupadas por semana, de la más reciente a la
 * más antigua (`workoutsRepo.terminados` ya las da así). Cada semana dice sus totales y abre sus series por grupo muscular;
 * cada sesión, el día en un cuadro, su rutina (o sus grupos más trabajados), sus cifras y sus récords. El detalle y la
 * edición viven en `DetalleEntreno`.
 */
export default function Historial({ onAbrir }: { onAbrir: (id: number) => void }) {
  const [mes, setMes] = useState(todayISO)
  const [semanaAbierta, setSemanaAbierta] = useState<string | null>(null)
  const workouts = useLiveQuery(() => workoutsRepo.terminados(), [])
  const nombreGimnasio = useNombresGimnasio()
  const contexto = useLiveQuery(async () => {
    const todas = await setsRepo.todas()
    const porWorkout = new Map<number, SetEntry[]>()
    for (const s of todas) {
      const delWorkout = porWorkout.get(s.workoutId)
      if (delWorkout) delWorkout.push(s)
      else porWorkout.set(s.workoutId, [s])
    }
    return { rutinas: new Map((await routinesRepo.listar()).map((r) => [r.id, r.nombre])), porWorkout, todas, ejercicios: await exercisesRepo.listar() }
  }, [])
  if (workouts === undefined) return <LoadingState />
  if (workouts.length === 0) return <EmptyState icon="dumbbell" title="Sin entrenos todavía">Cuando termines un entreno aparecerá aquí.</EmptyState>

  const semanas = calendarioMes(mes, workouts, id => volumenSets(contexto?.porWorkout.get(id) ?? []), todayISO())
  const diasMes = new Set(monthDates(mes))
  const lista = workouts.filter(w => diasMes.has(toISODate(new Date(w.inicio))))
  const porSemana: { lunes: string; sesiones: Workout[] }[] = []
  for (const w of lista) {
    const lunes = startOfWeek(toISODate(new Date(w.inicio)))
    const grupo = porSemana.at(-1)
    if (grupo?.lunes === lunes) grupo.sesiones.push(w)
    else porSemana.push({ lunes, sesiones: [w] })
  }
  const series = (w: Workout) => contexto?.porWorkout.get(w.id) ?? []
  const titulo = (w: Workout) => (w.routineId !== undefined ? contexto?.rutinas.get(w.routineId) : undefined)
    ?? (contexto ? gruposDeSesion(w, series(w), contexto.ejercicios) : null) ?? 'Entreno libre'

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
      <section aria-label="Sesiones del mes" className="space-y-stack">
        <SectionHeader variant="section">Sesiones del mes</SectionHeader>
        {lista.length === 0 ? <EmptyState>Sin entrenos este mes.</EmptyState> : porSemana.map(({ lunes, sesiones }) => {
          const minutos = sesiones.reduce((t, w) => t + (w.fin ?? w.inicio) - w.inicio, 0)
          const kg = sesiones.reduce((t, w) => t + volumenSets(series(w)), 0)
          return <div key={lunes}>
            <ListGroup aria-label={`Entrenos de la semana del ${etiquetaPeriodo('semana', lunes)}`}>
              {/* La semana, dentro de su tarjeta: sus totales y, al tocarla, sus series por grupo muscular. */}
              <li><button type="button" aria-haspopup="dialog" onClick={() => setSemanaAbierta(lunes)}
                aria-label={`Semana del ${etiquetaPeriodo('semana', lunes)}: ${sesiones.length} ${sesiones.length === 1 ? 'entreno' : 'entrenos'}, ${formatDuracion(minutos)}, ${formatInt(kg)} kg. Ver series por músculo`}
                className="app-button flex min-h-touch w-full items-center gap-3 py-3 text-left">
                <span className="min-w-0 flex-1">
                  <span className="block text-rotulo text-fg-muted">{etiquetaPeriodo('semana', lunes)}</span>
                  <span className="tabular block text-caption font-semibold text-fg">{sesiones.length} {sesiones.length === 1 ? 'entreno' : 'entrenos'} · {formatDuracion(minutos)} · {formatInt(kg)} kg</span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-body-sm font-semibold text-accent-strong">Músculos<Icon name="chevron-right" size={16} /></span>
              </button></li>
              {sesiones.map((w) => {
                const records = contexto ? recordsDeEntreno(w.id, workouts, contexto.todas).length : 0
                return <li key={w.id} data-sesion={w.id}>
                  <ListRow onClick={() => onAbrir(w.id)}>
                    <span className="flex min-w-0 flex-1 items-center gap-3">
                      <DiaSesion inicio={w.inicio} />
                      <span className="min-w-0">
                        <span className="sr-only">{formatFechaHora(w.inicio)}: </span>
                        <span className="block break-words text-body font-semibold text-fg">{titulo(w)}</span>
                        {/* El gimnasio, solo si no es el habitual (el de casi todas). */}
                        <span className="tabular block break-words text-caption text-fg-muted">
                          {formatHora(w.inicio)} · {detalleSesion(w, undefined, series(w), w.gimnasioId !== undefined ? nombreGimnasio(w.gimnasioId) : undefined)}
                        </span>
                      </span>
                    </span>
                    {records > 0 && <span className="tabular flex shrink-0 items-center gap-1 text-body-sm font-semibold text-accent-strong">
                      <Icon name="trophy" size={16} /><span className="sr-only">Récords: </span>{formatInt(records)}
                    </span>}
                    <Icon name="chevron-right" size={18} className="text-fg-subtle" />
                  </ListRow>
                </li>
              })}
            </ListGroup>
          </div>
        })}
      </section>
      {semanaAbierta && <SemanaGymSheet lunes={semanaAbierta} onClose={() => setSemanaAbierta(null)} />}
    </div>
  )
}
