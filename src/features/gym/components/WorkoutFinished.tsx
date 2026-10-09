import { lazy, Suspense } from 'react'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import { LoadingState } from '../../../shared/components/StateMessage'
import { formatNumber } from '../../../shared/lib/format'
import PosterSesion from './PosterSesion'
import { useFiguraMapa } from '../hooks/useFiguraMapa'
import type { ResumenMuscular } from '../lib/cargaMuscular'
import { describirRecord, type RecordEjercicio } from '../lib/records'

// Diferido: la geometría de los muñecos pesa más que el resto del mapa.
const MapaMuscular = lazy(() => import('./MapaMuscular'))

export interface WorkoutSummary {
  /** Nombre de la rutina o «Entreno libre». */
  titulo: string
  inicio: number
  fin: number
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
    <PosterSesion titulo={summary.titulo} inicio={summary.inicio} fin={summary.fin} series={summary.sets} volumen={summary.volume} levels={summary.muscle?.levels} figura={figura}
      estado={<p role="status" className="flex items-center gap-2 text-label"><span className="workout-finish-mark flex h-touch w-touch items-center justify-center rounded-md bg-accent text-accent-on"><Icon name="check" size={24} /></span>Sesión guardada en el historial</p>} />
    {!!summary.records?.length && <ListaRecords records={summary.records} nombres={summary.nombres ?? {}} />}
    {summary.muscle && <Suspense fallback={<LoadingState />}><MapaMuscular summary={summary.muscle} figura={figura} figuras={false} /></Suspense>}
    <Button variant="secondary" block size="lg" onClick={onClose}>Volver a Entreno<Icon name="chevron-right" size={18} /></Button>
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
