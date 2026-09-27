import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'
import Sheet from '../../components/Sheet'

export default function GymHome() {
  const [eligiendoRutina, setEligiendoRutina] = useState(false)
  const rutinas = useLiveQuery(() => db.routines.toArray(), [])

  async function empezarVacio() {
    await db.workouts.add({ inicio: Date.now() })
  }

  async function empezarDesdeRutina(routineId: number) {
    await db.workouts.add({ inicio: Date.now(), routineId })
    setEligiendoRutina(false)
  }

  return (
    <div className="space-y-3 pb-4">
      <button onClick={empezarVacio} className="w-full rounded-2xl bg-brand-600 py-4 text-base font-semibold text-white">
        Entreno vacío
      </button>
      <button
        onClick={() => setEligiendoRutina(true)}
        disabled={!rutinas || rutinas.length === 0}
        className="w-full rounded-2xl bg-slate-800 py-4 text-base font-semibold text-slate-200 disabled:opacity-40"
      >
        Desde rutina
      </button>
      {rutinas?.length === 0 && <p className="text-center text-sm text-slate-500">Crea una rutina primero en la pestaña Rutinas.</p>}

      <Sheet open={eligiendoRutina} onClose={() => setEligiendoRutina(false)} title="Elegir rutina">
        <div className="space-y-2">
          {rutinas?.map((r) => (
            <button key={r.id} onClick={() => empezarDesdeRutina(r.id!)} className="w-full rounded-xl bg-slate-800 px-3 py-3 text-left text-slate-100">
              {r.nombre}
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  )
}
