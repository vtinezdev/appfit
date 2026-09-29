import { useState } from 'react'
import BottomNav, { type Tab } from './BottomNav'
import NutricionTab from '../features/nutricion/NutricionTab'
import GymTab from '../features/gym/GymTab'
import Ajustes from './Ajustes'

export default function App() {
  const [tab, setTab] = useState<Tab>('nutricion')

  return (
    <div className="min-h-screen bg-bg">
      <main className="safe-top mx-auto max-w-lg pb-24">
        {tab === 'nutricion' && <NutricionTab />}
        {tab === 'gym' && <GymTab />}
        {tab === 'ajustes' && <Ajustes />}
      </main>
      <BottomNav tab={tab} onChange={setTab} />
    </div>
  )
}
