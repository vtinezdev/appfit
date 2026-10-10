import { lazy, Suspense, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import BottomNav, { type Tab } from './BottomNav'
import AccionesRapidas from './AccionesRapidas'
import InicioTab from '../features/inicio/InicioTab'
import NutricionTab from '../features/nutricion/NutricionTab'
import GymTab from '../features/gym/GymTab'
import Ajustes from './Ajustes'
import TrasladarDatos from './TrasladarDatos'
import AtmosferaApp from './AtmosferaApp'
import { LoadingState } from '../shared/components/StateMessage'
import type { NutrienteId } from '../shared/lib/referenciasNutricionales'
import type { AreaReferencias } from '../features/referencias/lib/contenidoReferencias'
import { getSettings } from '../shared/db/settings'
import { GAMIFICACION } from './navegacion'

const ReferenciasTab = lazy(() => import('../features/referencias/ReferenciasTab'))
const PerfilTab = lazy(() => import('../features/perfil/PerfilTab'))
const AtributosTab = lazy(() => import('../features/atributos/AtributosTab'))
const RitmoTab = lazy(() => import('../features/ritmo/RitmoTab'))
const VitrinaTab = lazy(() => import('../features/vitrina/VitrinaTab'))

export default function App() {
  const [tab, setTab] = useState<Tab>('inicio')
  const [abrirGuia, setAbrirGuia] = useState(false)
  const [abrirCopia, setAbrirCopia] = useState(false)
  const [anadirAlAbrir, setAnadirAlAbrir] = useState(false)
  const [acciones, setAcciones] = useState(false)
  const [referenciaInicial, setReferenciaInicial] = useState<NutrienteId | undefined>(undefined)
  const [areaReferencias, setAreaReferencias] = useState<AreaReferencias | undefined>(undefined)
  const scrollRef = useRef<HTMLElement>(null)
  const gamificacionVisible = useLiveQuery(async () => (await getSettings()).gamificacionVisible !== false, [])

  function navegar(siguiente: Tab) {
    setAbrirGuia(false)
    setAbrirCopia(false)
    setAnadirAlAbrir(false)
    setReferenciaInicial(undefined)
    setAreaReferencias(undefined)
    setTab(siguiente)
    scrollRef.current?.scrollTo({ top: 0 })
  }
  function irANutricion(anadir = false) {
    navegar('nutricion')
    setAnadirAlAbrir(anadir)
  }

  return (
    <div data-app-shell className="flex h-app flex-col bg-bg">
      {/* El fondo vive fuera del contenedor con scroll: queda quieto mientras el contenido se desplaza. */}
      <div className="relative isolate min-h-0 flex-1">
      <AtmosferaApp tab={tab} />
      <main ref={scrollRef} className="safe-top h-full overflow-y-auto overscroll-contain">
        <div key={tab} data-atmosphere={tab} className="app-view mx-auto w-full max-w-lg pb-6">
        {tab === 'inicio' && <InicioTab onIrANutricion={() => irANutricion()} onIrAGym={() => navegar('gym')} onIrAAtributos={() => navegar('atributos')} onIrARitmo={() => navegar('ritmo')} onExportarCopia={() => { navegar('ajustes'); setAbrirCopia(true) }}
          ayudaInicial={<TrasladarDatos onVerInstrucciones={() => { navegar('ajustes'); setAbrirGuia(true) }} />} />}
        {tab === 'nutricion' && <NutricionTab anadirAlAbrir={anadirAlAbrir} onVerReferencia={id => { navegar('referencias'); setReferenciaInicial(id) }} />}
        {tab === 'gym' && <GymTab />}
        {tab === 'perfil' && <Suspense fallback={<LoadingState />}><PerfilTab onVerMetodo={() => { navegar('referencias'); setAreaReferencias('energia') }} /></Suspense>}
        {tab === 'atributos' && <Suspense fallback={<LoadingState />}><AtributosTab onIrAAjustes={() => navegar('ajustes')} /></Suspense>}
        {tab === 'ritmo' && <Suspense fallback={<LoadingState />}><RitmoTab onIrAAjustes={() => navegar('ajustes')} /></Suspense>}
        {tab === 'vitrina' && <Suspense fallback={<LoadingState />}><VitrinaTab onIrAAjustes={() => navegar('ajustes')} /></Suspense>}
        {tab === 'ajustes' && <Ajustes abrirGuia={abrirGuia} abrirCopia={abrirCopia} onIrAPerfil={() => navegar('perfil')} />}
        {tab === 'referencias' && <Suspense fallback={<LoadingState />}><ReferenciasTab nutrienteInicial={referenciaInicial} areaInicial={areaReferencias} /></Suspense>}
        </div>
      </main>
      </div>
      <BottomNav tab={tab} onChange={navegar} onAcciones={() => setAcciones(true)} accionesAbiertas={acciones} ocultos={gamificacionVisible === false ? GAMIFICACION : []} />
      <AccionesRapidas open={acciones} onClose={() => setAcciones(false)} onComida={() => irANutricion(true)} onEntreno={() => navegar('gym')} />
    </div>
  )
}
