import { lazy, Suspense, useRef, useState } from 'react'
import BottomNav, { type Tab } from './BottomNav'
import InicioTab from '../features/inicio/InicioTab'
import NutricionTab from '../features/nutricion/NutricionTab'
import GymTab from '../features/gym/GymTab'
import Ajustes from './Ajustes'
import TrasladarDatos from './TrasladarDatos'
import AtmosferaApp from './AtmosferaApp'
import { LoadingState } from '../shared/components/StateMessage'
import type { NutrienteId } from '../shared/lib/referenciasNutricionales'
import type { AreaReferencias } from '../features/referencias/lib/contenidoReferencias'

const ReferenciasTab = lazy(() => import('../features/referencias/ReferenciasTab'))
const PerfilTab = lazy(() => import('../features/perfil/PerfilTab'))

export default function App() {
  const [tab, setTab] = useState<Tab>('inicio')
  const [abrirGuia, setAbrirGuia] = useState(false)
  const [anadirAlAbrir, setAnadirAlAbrir] = useState(false)
  const [referenciaInicial, setReferenciaInicial] = useState<NutrienteId | undefined>(undefined)
  const [areaReferencias, setAreaReferencias] = useState<AreaReferencias | undefined>(undefined)
  const scrollRef = useRef<HTMLElement>(null)

  function navegar(siguiente: Tab) {
    setAbrirGuia(false)
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
        {tab === 'inicio' && <InicioTab onIrANutricion={() => irANutricion()} onAnadirComida={() => irANutricion(true)} onIrAGym={() => navegar('gym')}
          ayudaInicial={<TrasladarDatos onVerInstrucciones={() => { navegar('ajustes'); setAbrirGuia(true) }} />} />}
        {tab === 'nutricion' && <NutricionTab anadirAlAbrir={anadirAlAbrir} onVerReferencia={id => { navegar('referencias'); setReferenciaInicial(id) }} />}
        {tab === 'gym' && <GymTab />}
        {tab === 'perfil' && <Suspense fallback={<LoadingState />}><PerfilTab onVerMetodo={() => { navegar('referencias'); setAreaReferencias('energia') }} /></Suspense>}
        {tab === 'ajustes' && <Ajustes abrirGuia={abrirGuia} onIrAPerfil={() => navegar('perfil')} />}
        {tab === 'referencias' && <Suspense fallback={<LoadingState />}><ReferenciasTab nutrienteInicial={referenciaInicial} areaInicial={areaReferencias} /></Suspense>}
        </div>
      </main>
      </div>
      <BottomNav tab={tab} onChange={navegar} />
    </div>
  )
}
