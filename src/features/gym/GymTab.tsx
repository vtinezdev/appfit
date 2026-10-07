import { LoadingState } from '../../shared/components/StateMessage'
import PageHeader from '../../shared/components/PageHeader'
import ViewTabs from '../../shared/components/ViewTabs'
import { lazy, Suspense, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import * as workoutsRepo from './data/workoutsRepo'
import GymHome from './pages/GymHome'
import Rutinas from './pages/Rutinas'
import Historial from './pages/Historial'
import DetalleEntreno from './pages/DetalleEntreno'
import WorkoutFinished, { type WorkoutSummary } from './components/WorkoutFinished'

// Progreso lleva Recharts: se carga aparte para no inflar el arranque de la app.
const Progreso = lazy(() => import('./pages/Progreso'))
const EntrenoActivo = lazy(() => import('./pages/EntrenoActivo'))

type Vista = 'inicio' | 'rutinas' | 'historial' | 'progreso'

export default function GymTab() {
  const [vista, setVista] = useState<Vista>('inicio')
  const [summary, setSummary] = useState<WorkoutSummary | null>(null)
  const [detalle, setDetalle] = useState<{ id: number; editar: boolean } | null>(null)
  const activeWorkout = useLiveQuery(() => workoutsRepo.activo(), [])

  if (summary) return <WorkoutFinished summary={summary} onClose={() => { setSummary(null); setVista('inicio') }} />
  if (activeWorkout) {
    return <Suspense fallback={<div className="px-page pt-5"><LoadingState /></div>}><EntrenoActivo key={activeWorkout.id} workout={activeWorkout} onFinished={setSummary} /></Suspense>
  }

  if (detalle) return <DetalleEntreno key={detalle.id} workoutId={detalle.id} editarInicial={detalle.editar} onVolver={() => { setDetalle(null); setVista('historial') }} />

  return (
    <div className="space-y-3 px-page pt-5">
        <PageHeader title="Entreno" />
        <ViewTabs
          label="Vistas de entrenamiento"
          opciones={[
            { valor: 'inicio', label: 'Inicio' },
            { valor: 'rutinas', label: 'Rutinas' },
            { valor: 'historial', label: 'Historial' },
            { valor: 'progreso', label: 'Progreso' },
          ]}
          valor={vista}
          onChange={setVista}
        >
      {vista === 'inicio' && <GymHome onRegistrado={(id) => setDetalle({ id, editar: true })} />}
      {vista === 'rutinas' && <Rutinas />}
      {vista === 'historial' && <Historial onAbrir={(id) => setDetalle({ id, editar: false })} />}
      {vista === 'progreso' && (
        <Suspense fallback={<LoadingState />}>
          <Progreso />
        </Suspense>
      )}
      </ViewTabs>
    </div>
  )
}
