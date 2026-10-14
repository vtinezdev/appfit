import { LoadingState } from '../../shared/components/StateMessage'
import PageHeader from '../../shared/components/PageHeader'
import ViewTabs from '../../shared/components/ViewTabs'
import { lazy, Suspense, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAviso } from '../../shared/hooks/useAviso'
import * as workoutsRepo from './data/workoutsRepo'
import * as actividadesRepo from '../actividades/data/actividadesRepo'
import { tituloActividad } from '../actividades/lib/actividad'
import GymHome from './pages/GymHome'
import Rutinas from './pages/Rutinas'
import Historial from './pages/Historial'
import DetalleEntreno from './pages/DetalleEntreno'
import WorkoutFinished, { type WorkoutSummary } from './components/WorkoutFinished'

// Progreso lleva Recharts: se carga aparte para no inflar el arranque de la app.
const Progreso = lazy(() => import('./pages/Progreso'))
const EntrenoActivo = lazy(() => import('./pages/EntrenoActivo'))
// Actividades (formularios, GPX y geometría) va aparte: no entra en el arranque.
const ActividadesHome = lazy(() => import('../actividades/pages/ActividadesHome'))
const GrabacionActiva = lazy(() => import('../actividades/pages/GrabacionActiva'))
const DetalleActividad = lazy(() => import('../actividades/pages/DetalleActividad'))

type Vista = 'inicio' | 'rutinas' | 'historial' | 'progreso'
/** Entreno tiene dos secciones: el gimnasio (con sus vistas) y las actividades (caminar, correr, senderismo). */
export type SeccionEntreno = 'gimnasio' | 'actividades'

const cargando = <div className="px-page pt-5"><LoadingState /></div>

interface Props {
  seccionInicial?: SeccionEntreno
  /** Con un entreno en curso, si se ve su pantalla o la pestaña de siempre (con el entreno minimizado sobre la barra). */
  entrenoAbierto: boolean
  onAbrirEntreno: () => void
  onMinimizarEntreno: () => void
}

export default function GymTab({ seccionInicial = 'gimnasio', entrenoAbierto, onAbrirEntreno, onMinimizarEntreno }: Props) {
  const [seccion, setSeccion] = useState<SeccionEntreno>(seccionInicial)
  const [vista, setVista] = useState<Vista>('inicio')
  const [summary, setSummary] = useState<WorkoutSummary | null>(null)
  const [detalle, setDetalle] = useState<{ id: number; editar: boolean } | null>(null)
  const [detalleActividad, setDetalleActividad] = useState<number | null>(null)
  const activeWorkout = useLiveQuery(() => workoutsRepo.activo(), [])
  const grabacion = useLiveQuery(() => actividadesRepo.enCurso(), [])
  const { avisar, toast } = useAviso()

  // La grabación con GPS va primero: es la que no puede esperar.
  if (grabacion) {
    return <Suspense fallback={cargando}><GrabacionActiva key={grabacion.id} actividad={grabacion} onTerminada={(id) => { setSeccion('actividades'); setDetalleActividad(id) }} /></Suspense>
  }
  if (summary) return <WorkoutFinished summary={summary} onClose={() => { setSummary(null); setVista('inicio') }} />
  if (activeWorkout && entrenoAbierto) {
    return <Suspense fallback={cargando}><EntrenoActivo key={activeWorkout.id} workout={activeWorkout} onFinished={setSummary} onMinimizar={onMinimizarEntreno} /></Suspense>
  }

  if (detalle) return <DetalleEntreno key={detalle.id} workoutId={detalle.id} editarInicial={detalle.editar} onVolver={() => { setDetalle(null); setVista('historial') }} />
  if (detalleActividad !== null) {
    return <>
      <Suspense fallback={cargando}>
        <DetalleActividad key={detalleActividad} actividadId={detalleActividad} onVolver={() => setDetalleActividad(null)}
          onBorrada={(a) => avisar({ mensaje: `${tituloActividad(a)} borrada`, onDeshacer: () => actividadesRepo.restaurar(a) })} />
      </Suspense>
      {toast}
    </>
  }

  return (
    <div className="space-y-3 px-page pt-5">
      <PageHeader title="Entreno" />
      <ViewTabs
        label="Secciones de entreno"
        nivel="principal"
        opciones={[{ valor: 'gimnasio', label: 'Gimnasio' }, { valor: 'actividades', label: 'Actividades' }]}
        valor={seccion}
        onChange={setSeccion}
      >
        {seccion === 'gimnasio' && <ViewTabs
          label="Vistas de entrenamiento"
          opciones={[
            { valor: 'inicio', label: 'Empezar' }, // no «Inicio»: se confundiría con el destino Inicio
            { valor: 'rutinas', label: 'Rutinas' },
            { valor: 'historial', label: 'Historial' },
            { valor: 'progreso', label: 'Progreso' },
          ]}
          valor={vista}
          onChange={setVista}
        >
          {vista === 'inicio' && <GymHome enCurso={!!activeWorkout} onEmpezado={onAbrirEntreno} onRegistrado={(id) => setDetalle({ id, editar: true })} />}
          {vista === 'rutinas' && <Rutinas enCurso={!!activeWorkout} onEmpezado={onAbrirEntreno} />}
          {vista === 'historial' && <Historial onAbrir={(id) => setDetalle({ id, editar: false })} />}
          {vista === 'progreso' && (
            <Suspense fallback={<LoadingState />}>
              <Progreso />
            </Suspense>
          )}
        </ViewTabs>}
        {seccion === 'actividades' && <Suspense fallback={<LoadingState />}><ActividadesHome onAbrir={setDetalleActividad} /></Suspense>}
      </ViewTabs>
      {toast}
    </div>
  )
}
