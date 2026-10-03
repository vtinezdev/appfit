import { useRef, useState } from 'react'
import BottomNav, { type Tab } from './BottomNav'
import InicioTab from '../features/inicio/InicioTab'
import NutricionTab from '../features/nutricion/NutricionTab'
import GymTab from '../features/gym/GymTab'
import Ajustes from './Ajustes'
import TrasladarDatos from './TrasladarDatos'

export default function App() {
  const [tab, setTab] = useState<Tab>('inicio')
  const [abrirGuia, setAbrirGuia] = useState(false)
  const [anadirAlAbrir, setAnadirAlAbrir] = useState(false)
  const scrollRef = useRef<HTMLElement>(null)

  function navegar(siguiente: Tab) {
    setAbrirGuia(false)
    setAnadirAlAbrir(false)
    setTab(siguiente)
    scrollRef.current?.scrollTo({ top: 0 })
  }
  function irANutricion(anadir = false) {
    navegar('nutricion')
    setAnadirAlAbrir(anadir)
  }

  return (
    <div data-app-shell className="flex h-app flex-col bg-bg">
      <main ref={scrollRef} className="safe-top min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div key={tab} className="app-view mx-auto w-full max-w-lg pb-6">
        {tab === 'inicio' && <InicioTab onIrANutricion={() => irANutricion()} onAnadirComida={() => irANutricion(true)} onIrAGym={() => navegar('gym')}
          ayudaInicial={<TrasladarDatos onVerInstrucciones={() => { navegar('ajustes'); setAbrirGuia(true) }} />} />}
        {tab === 'nutricion' && <NutricionTab anadirAlAbrir={anadirAlAbrir} />}
        {tab === 'gym' && <GymTab />}
        {tab === 'ajustes' && <Ajustes abrirGuia={abrirGuia} />}
        </div>
      </main>
      <BottomNav tab={tab} onChange={navegar} />
    </div>
  )
}
