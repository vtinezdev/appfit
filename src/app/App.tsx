import { useState } from 'react'
import BottomNav, { type Tab } from './BottomNav'
import InicioTab from '../features/inicio/InicioTab'
import NutricionTab from '../features/nutricion/NutricionTab'
import GymTab from '../features/gym/GymTab'
import Ajustes from './Ajustes'

export default function App() {
  const [tab, setTab] = useState<Tab>('inicio')

  return (
    <div className="relative isolate min-h-screen bg-bg">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-glow bg-page-glow" />
      <main className="safe-top mx-auto max-w-lg pb-nav">
        {tab === 'inicio' && <InicioTab onIrANutricion={() => setTab('nutricion')} onIrAGym={() => setTab('gym')} />}
        {tab === 'nutricion' && <NutricionTab />}
        {tab === 'gym' && <GymTab />}
        {tab === 'ajustes' && <Ajustes />}
      </main>
      <BottomNav tab={tab} onChange={setTab} />
    </div>
  )
}
