import { lazy, Suspense } from 'react'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import Metric from '../../../shared/components/Metric'
import { LoadingState } from '../../../shared/components/StateMessage'
import PageHeader from '../../../shared/components/PageHeader'
import { formatNumber } from '../../../shared/lib/format'
import { clockText } from '../lib/session'
import { useFiguraMapa } from '../hooks/useFiguraMapa'
import type { ResumenMuscular } from '../lib/cargaMuscular'
import { describirRecord, type RecordEjercicio } from '../lib/records'

// Diferido: la geometría de los muñecos pesa más que el resto del mapa.
const MapaMuscular = lazy(() => import('./MapaMuscular'))

export interface WorkoutSummary {
  seconds: number
  exercises: number
  sets: number
  volume: number
  muscle?: ResumenMuscular
  /** Récords frente a los entrenos anteriores y nombres de ejercicio para mostrarlos. */
  records?: RecordEjercicio[]
  nombres?: Record<number, string>
}

export default function WorkoutFinished({ summary, onClose }: { summary: WorkoutSummary; onClose: () => void }) {
  const figura = useFiguraMapa()
  return <div className="space-y-section px-page pt-5">
    <PageHeader title="Sesión guardada" overline="Tu entrenamiento ya está en el historial." />
    <section aria-label="Resumen del entrenamiento guardado" className="training-surface space-y-6 p-5">
      <div className="workout-finish-mark flex h-14 w-14 items-center justify-center rounded-md bg-accent text-accent-on"><Icon name="check" size={30} /></div>
      <div><p className="training-muted text-body-sm">Tiempo de sesión</p><p className="font-numeric tabular text-hero">{clockText(summary.seconds)}</p></div>
      <div className="grid grid-cols-3 gap-3 workout-summary-metrics">
        <Metric label="Ejercicios" size="title" valor={summary.exercises} />
        <Metric label="Series" size="title" valor={summary.sets} />
        <Metric label="Volumen" size="title" valor={summary.volume} unidad="kg" />
      </div>
    </section>
    {!!summary.records?.length && <ListaRecords records={summary.records} nombres={summary.nombres ?? {}} />}
    {summary.muscle && <Suspense fallback={<LoadingState />}><MapaMuscular summary={summary.muscle} figura={figura} /></Suspense>}
    <Button block size="lg" onClick={onClose}>Volver a Entreno<Icon name="chevron-right" size={18} /></Button>
  </div>
}

/** Récords personales de un entreno frente a los anteriores (solo series efectivas). */
export function ListaRecords({ records, nombres }: { records: RecordEjercicio[]; nombres: Record<number, string> }) {
  return <section aria-label="Récords personales" className="space-y-2">
    <h2 className="flex items-center gap-2 text-heading"><Icon name="trophy" size={22} className="text-accent-strong" />Récords personales</h2>
    <ListGroup aria-label="Récords conseguidos">
      {records.map((r, i) => <li key={`${r.exerciseId}-${r.tipo}-${r.peso ?? 0}-${i}`} className="py-3">
        <p className="break-words text-body font-medium text-fg">{nombres[r.exerciseId] ?? 'Ejercicio'}</p>
        <p className="tabular text-body-sm text-fg-muted">{describirRecord(r, (n) => formatNumber(n, 2))}</p>
      </li>)}
    </ListGroup>
  </section>
}
