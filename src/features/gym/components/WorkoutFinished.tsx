import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import Metric from '../../../shared/components/Metric'
import PageHeader from '../../../shared/components/PageHeader'
import { clockText } from '../lib/session'

export interface WorkoutSummary { seconds: number; exercises: number; sets: number; volume: number }
export default function WorkoutFinished({ summary, onClose }: { summary: WorkoutSummary; onClose: () => void }) {
  return <div className="space-y-section px-page pt-5">
    <PageHeader title="Sesión guardada" overline="Tu entrenamiento ya está en el historial." />
    <section aria-label="Resumen del entrenamiento guardado" className="training-surface space-y-6 p-5">
      <div className="workout-finish-mark flex h-14 w-14 items-center justify-center rounded-md bg-accent text-accent-on"><Icon name="check" size={30} /></div>
      <div><p className="training-muted text-body-sm">Tiempo de sesión</p><p className="tabular text-hero font-extrabold">{clockText(summary.seconds)}</p></div>
      <div className="grid grid-cols-3 gap-3 workout-summary-metrics">
        <Metric label="Ejercicios" size="title" valor={summary.exercises} />
        <Metric label="Series" size="title" valor={summary.sets} />
        <Metric label="Volumen" size="title" valor={summary.volume} unidad="kg" />
      </div>
    </section>
    <Button block size="lg" onClick={onClose}>Volver a Entreno<Icon name="chevron-right" size={18} /></Button>
  </div>
}
