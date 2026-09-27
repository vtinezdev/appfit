import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Workout } from '../../db'
import { volumenSets } from '../../lib/workout'
import Sheet from '../../components/Sheet'

function formatFechaHora(ts: number): string {
  return new Date(ts).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function formatDuracion(inicio: number, fin: number): string {
  const min = Math.round((fin - inicio) / 60000)
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)} h ${min % 60} min`
}

export default function Historial() {
  const [seleccionado, setSeleccionado] = useState<Workout | null>(null)
  const workouts = useLiveQuery(
    () => db.workouts.filter((w) => w.fin !== undefined).reverse().sortBy('inicio'),
    [],
  )
  const detalleSets = useLiveQuery(() => (seleccionado?.id ? db.sets.where('workoutId').equals(seleccionado.id).toArray() : []), [seleccionado?.id])
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  const exerciseMap = new Map((exercises ?? []).map((e) => [e.id!, e]))

  const lista = workouts ? [...workouts].reverse() : []

  const porEjercicio = new Map<number, typeof detalleSets>()
  for (const s of detalleSets ?? []) {
    const arr = porEjercicio.get(s.exerciseId) ?? []
    arr.push(s)
    porEjercicio.set(s.exerciseId, arr)
  }

  return (
    <div className="space-y-2 pb-4">
      {lista.length === 0 && <p className="px-1 text-sm text-slate-500">Todavía no has completado ningún entreno.</p>}
      {lista.map((w) => (
        <button key={w.id} onClick={() => setSeleccionado(w)} className="w-full rounded-xl bg-slate-900 px-3 py-3 text-left">
          <p className="font-medium text-slate-100">{formatFechaHora(w.inicio)}</p>
          <p className="text-xs text-slate-500">{w.fin ? formatDuracion(w.inicio, w.fin) : '—'}</p>
        </button>
      ))}

      <Sheet open={seleccionado !== null} onClose={() => setSeleccionado(null)} title={seleccionado ? formatFechaHora(seleccionado.inicio) : ''}>
        <div className="space-y-3">
          {Array.from(porEjercicio.entries()).map(([exId, sets]) => (
            <div key={exId}>
              <p className="mb-1 text-sm font-medium text-slate-200">{exerciseMap.get(exId)?.nombre ?? '…'}</p>
              <div className="space-y-0.5 text-sm text-slate-400">
                {sets
                  ?.sort((a, b) => a.orden - b.orden)
                  .map((s) => (
                    <p key={s.id}>
                      {s.reps} reps × {s.peso} kg
                    </p>
                  ))}
                <p className="text-xs text-slate-600">Volumen: {volumenSets(sets ?? [])} kg</p>
              </div>
            </div>
          ))}
          {porEjercicio.size === 0 && <p className="text-sm text-slate-500">Sin ejercicios registrados.</p>}
        </div>
      </Sheet>
    </div>
  )
}
