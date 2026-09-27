import { useState } from 'react'
import BottomNav, { type Tab } from './components/BottomNav'
import NutricionTab from './pages/NutricionTab'
import GymTab from './pages/GymTab'
import Ajustes from './pages/Ajustes'

export default function App() {
  const [tab, setTab] = useState<Tab>('nutricion')

  return (
    <div className="min-h-screen bg-slate-950">
      <main className="safe-top mx-auto max-w-lg pb-24">
        {tab === 'nutricion' && <NutricionTab />}
        {tab === 'gym' && <GymTab />}
        {tab === 'ajustes' && <Ajustes />}
      </main>
      <BottomNav tab={tab} onChange={setTab} />
    </div>
  )
}
