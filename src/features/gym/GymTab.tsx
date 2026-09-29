import { LoadingState } from '../../shared/components/StateMessage'
import SegmentedControl from '../../shared/components/SegmentedControl'
import { lazy, Suspense, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import * as workoutsRepo from './data/workoutsRepo'
import GymHome from './pages/GymHome'
import Rutinas from './pages/Rutinas'
import Historial from './pages/Historial'
import EntrenoActivo from './pages/EntrenoActivo'

// Progreso lleva Recharts: se carga aparte para no inflar el arranque de la app.
const Progreso = lazy(() => import('./pages/Progreso'))

type Vista = 'inicio' | 'rutinas' | 'historial' | 'progreso'

export default function GymTab() {
  const [vista, setVista] = useState<Vista>('inicio')
  const activeWorkout = useLiveQuery(() => workoutsRepo.activo(), [])

  if (activeWorkout) {
    return <EntrenoActivo workout={activeWorkout} />
  }

  return (
    <div className="min-h-full px-4 pt-4">
      <SegmentedControl
        size="sm"
        className="mb-4"
        opciones={[
          { valor: 'inicio', label: 'Inicio' },
          { valor: 'rutinas', label: 'Rutinas' },
          { valor: 'historial', label: 'Historial' },
          { valor: 'progreso', label: 'Progreso' },
        ]}
        valor={vista}
        onChange={setVista}
      />

      {vista === 'inicio' && <GymHome />}
      {vista === 'rutinas' && <Rutinas />}
      {vista === 'historial' && <Historial />}
      {vista === 'progreso' && (
        <Suspense fallback={<LoadingState />}>
          <Progreso />
        </Suspense>
      )}
    </div>
  )
}
