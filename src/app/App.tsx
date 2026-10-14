import { lazy, Suspense, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import BottomNav, { type Tab } from './BottomNav'
import AccionesRapidas from './AccionesRapidas'
import InicioTab from '../features/inicio/InicioTab'
import NutricionTab from '../features/nutricion/NutricionTab'
import GymTab, { type SeccionEntreno } from '../features/gym/GymTab'
import Ajustes from './Ajustes'
import type { SeccionAjustes } from './seccionesAjustes'
import TrasladarDatos from './TrasladarDatos'
import AtmosferaApp from './AtmosferaApp'
import { LoadingState } from '../shared/components/StateMessage'
import type { NutrienteId } from '../shared/lib/referenciasNutricionales'
import type { AreaReferencias } from '../features/referencias/lib/contenidoReferencias'
import { getSettings } from '../shared/db/settings'
import * as workoutsRepo from '../features/gym/data/workoutsRepo'
import EntrenoMinimizado from '../features/gym/components/EntrenoMinimizado'
import { GAMIFICACION } from './navegacion'

const ReferenciasTab = lazy(() => import('../features/referencias/ReferenciasTab'))
const PerfilTab = lazy(() => import('../features/perfil/PerfilTab'))
const CumbresTab = lazy(() => import('../features/cumbres/CumbresTab'))
const CaminosTab = lazy(() => import('../features/caminos/CaminosTab'))
const RitmoTab = lazy(() => import('../features/ritmo/RitmoTab'))
const VitrinaTab = lazy(() => import('../features/vitrina/VitrinaTab'))

export default function App() {
  const [tab, setTab] = useState<Tab>('inicio')
  const [seccionAjustes, setSeccionAjustes] = useState<SeccionAjustes | undefined>(undefined)
  const [anadirAlAbrir, setAnadirAlAbrir] = useState(false)
  const [acciones, setAcciones] = useState(false)
  const [seccionEntreno, setSeccionEntreno] = useState<SeccionEntreno | undefined>(undefined)
  const [referenciaInicial, setReferenciaInicial] = useState<NutrienteId | undefined>(undefined)
  const [areaReferencias, setAreaReferencias] = useState<AreaReferencias | undefined>(undefined)
  const scrollRef = useRef<HTMLElement>(null)
  const gamificacionVisible = useLiveQuery(async () => (await getSettings()).gamificacionVisible !== false, [])
  const entrenoActivo = useLiveQuery(() => workoutsRepo.activo(), [])
  /** Si el entreno en curso ocupa Entreno. Salir de la pantalla lo minimiza; la barra sobre la navegación lo vuelve a abrir. */
  const [entrenoAbierto, setEntrenoAbierto] = useState(false)
  const entrenoMinimizado = entrenoActivo && !(tab === 'gym' && entrenoAbierto) ? entrenoActivo : undefined

  function navegar(siguiente: Tab) {
    setSeccionAjustes(undefined)
    setAnadirAlAbrir(false)
    setReferenciaInicial(undefined)
    setAreaReferencias(undefined)
    setSeccionEntreno(undefined)
    setEntrenoAbierto(false)
    setTab(siguiente)
    scrollRef.current?.scrollTo({ top: 0 })
  }
  function irAEntreno(seccion?: SeccionEntreno) {
    navegar('gym')
    setSeccionEntreno(seccion)
  }
  /** Entreno con su sesión en curso a la vista (si no hay, la pestaña de siempre). */
  function abrirEntreno() {
    irAEntreno()
    setEntrenoAbierto(true)
  }
  function irAAjustes(seccion?: SeccionAjustes) {
    navegar('ajustes')
    setSeccionAjustes(seccion)
  }
  function irANutricion(anadir = false) {
    navegar('nutricion')
    setAnadirAlAbrir(anadir)
  }

  return (
    <div data-app-shell data-mini-entreno={entrenoMinimizado ? '' : undefined} className="relative flex h-app flex-col bg-bg">
      {/* El fondo vive fuera del contenedor con scroll: queda quieto mientras el contenido se desplaza. */}
      <div className="relative isolate min-h-0 flex-1">
      <AtmosferaApp tab={tab} />
      <main ref={scrollRef} className="safe-top h-full overflow-y-auto overscroll-contain">
        <div key={tab} data-atmosphere={tab} className="app-view mx-auto w-full max-w-lg">
        {tab === 'inicio' && <InicioTab onIrANutricion={() => irANutricion()} onIrAGym={abrirEntreno} onIrACumbres={() => navegar('cumbres')} onIrACaminos={() => navegar('caminos')} onIrARitmo={() => navegar('ritmo')} onExportarCopia={() => irAAjustes('copias')} onRevisarCuenta={() => irAAjustes('cuenta')}
          ayudaInicial={<TrasladarDatos onVerInstrucciones={() => irAAjustes('instalacion')} />} />}
        {tab === 'nutricion' && <NutricionTab anadirAlAbrir={anadirAlAbrir} onVerReferencia={id => { navegar('referencias'); setReferenciaInicial(id) }} />}
        {tab === 'gym' && <GymTab seccionInicial={seccionEntreno} entrenoAbierto={entrenoAbierto} onAbrirEntreno={() => setEntrenoAbierto(true)} onMinimizarEntreno={() => setEntrenoAbierto(false)} />}
        {tab === 'perfil' && <Suspense fallback={<LoadingState />}><PerfilTab onVerMetodo={() => { navegar('referencias'); setAreaReferencias('energia') }} /></Suspense>}
        {tab === 'cumbres' && <Suspense fallback={<LoadingState />}><CumbresTab onIrAAjustes={() => irAAjustes('gamificacion')} /></Suspense>}
        {tab === 'caminos' && <Suspense fallback={<LoadingState />}><CaminosTab onIrAAjustes={() => irAAjustes('gamificacion')} onIrAActividades={() => irAEntreno('actividades')} /></Suspense>}
        {tab === 'ritmo' && <Suspense fallback={<LoadingState />}><RitmoTab onIrAAjustes={() => irAAjustes('gamificacion')} /></Suspense>}
        {tab === 'vitrina' && <Suspense fallback={<LoadingState />}><VitrinaTab onIrAAjustes={() => irAAjustes('gamificacion')} /></Suspense>}
        {tab === 'ajustes' && <Ajustes seccionInicial={seccionAjustes} onIrAPerfil={() => navegar('perfil')} />}
        {tab === 'referencias' && <Suspense fallback={<LoadingState />}><ReferenciasTab nutrienteInicial={referenciaInicial} areaInicial={areaReferencias} /></Suspense>}
        </div>
      </main>
      </div>
      <BottomNav tab={tab} onChange={navegar} onAcciones={() => setAcciones(true)} accionesAbiertas={acciones} ocultos={gamificacionVisible === false ? GAMIFICACION : []}
        encima={entrenoMinimizado && <EntrenoMinimizado key={entrenoMinimizado.id} workout={entrenoMinimizado} onAbrir={abrirEntreno} />} />
      <AccionesRapidas open={acciones} onClose={() => setAcciones(false)} onComida={() => irANutricion(true)} onEntreno={abrirEntreno} onActividades={() => irAEntreno('actividades')} />
    </div>
  )
}
