import { lazy, Suspense } from 'react'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import { LoadingState } from '../../../shared/components/StateMessage'
import PosterSesion from './PosterSesion'
import CumbreSesion from '../../cumbres/components/CumbreSesion'
import NuevosLogros from '../../vitrina/components/NuevosLogros'
import AscensosLiga from '../../liga/components/AscensosLiga'
import PublicarEntreno from './PublicarEntreno'
import { useFiguraMapa } from '../hooks/useFiguraMapa'
import type { ResumenMuscular } from '../lib/cargaMuscular'
import type { RecordEjercicio } from '../lib/records'
import RecordsSesion from './RecordsSesion'

// Diferido: la geometría de los muñecos pesa más que el resto del mapa.
const MapaMuscular = lazy(() => import('./MapaMuscular'))
const ProgresoSesion = lazy(() => import('./ProgresoSesion'))

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
  /** Para las miniaturas de los récords. */
  catalogIds?: Record<number, string | undefined>
  /** Para mostrar los metros que sube el entreno (Cumbres). */
  workoutId?: number
}

export default function WorkoutFinished({ summary, onClose }: { summary: WorkoutSummary; onClose: () => void }) {
  const figura = useFiguraMapa()
  return <div className="space-y-section px-page pt-5">
    <PosterSesion titulo={summary.titulo} inicio={summary.inicio} fin={summary.fin} series={summary.sets} volumen={summary.volume} levels={summary.muscle?.levels} figura={figura}
      estado={<p role="status" className="flex items-center gap-2 text-label"><span className="workout-finish-mark flex h-touch w-touch items-center justify-center rounded-md bg-accent text-accent-on"><Icon name="check" size={24} /></span>Sesión guardada en el historial</p>} />
    {summary.workoutId !== undefined && <Suspense fallback={null}><ProgresoSesion workoutId={summary.workoutId} figura={figura} /></Suspense>}
    {!!summary.records?.length && <RecordsSesion records={summary.records} nombres={summary.nombres ?? {}} catalogIds={summary.catalogIds} />}
    {summary.workoutId !== undefined && <CumbreSesion workoutId={summary.workoutId} />}
    {summary.workoutId !== undefined && <AscensosLiga workoutId={summary.workoutId} nombres={summary.nombres ?? {}} />}
    {summary.workoutId !== undefined && <NuevosLogros workoutId={summary.workoutId} />}
    {summary.muscle && <Suspense fallback={<LoadingState />}><MapaMuscular summary={summary.muscle} figura={figura} figuras={false} /></Suspense>}
    {summary.workoutId !== undefined && <PublicarEntreno workoutId={summary.workoutId} titulo={summary.titulo} inicio={summary.inicio} fin={summary.fin}
      series={summary.sets} volumen={summary.volume} records={summary.records ?? []} nombres={summary.nombres ?? {}} />}
    <Button variant="secondary" block size="lg" onClick={onClose}>Volver a Entreno<Icon name="chevron-right" size={18} /></Button>
  </div>
}
