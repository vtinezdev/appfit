import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import GymHome from './gym/GymHome'
import Rutinas from './gym/Rutinas'
import Historial from './gym/Historial'
import Progreso from './gym/Progreso'
import EntrenoActivo from './gym/EntrenoActivo'

type Vista = 'inicio' | 'rutinas' | 'historial' | 'progreso'

export default function GymTab() {
  const [vista, setVista] = useState<Vista>('inicio')
  const activeWorkout = useLiveQuery(() => db.workouts.filter((w) => w.fin === undefined).first(), [])

  if (activeWorkout) {
    return <EntrenoActivo workout={activeWorkout} />
  }

  return (
    <div className="min-h-full px-4 pt-4">
      <div className="mb-4 flex gap-2">
        {(
          [
            ['inicio', 'Inicio'],
            ['rutinas', 'Rutinas'],
            ['historial', 'Historial'],
            ['progreso', 'Progreso'],
          ] as [Vista, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setVista(key)}
            className={`flex-1 rounded-lg py-2 text-xs font-medium ${vista === key ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {vista === 'inicio' && <GymHome />}
      {vista === 'rutinas' && <Rutinas />}
      {vista === 'historial' && <Historial />}
      {vista === 'progreso' && <Progreso />}
    </div>
  )
}
