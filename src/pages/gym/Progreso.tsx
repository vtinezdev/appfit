import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db } from '../../db'
import { epley1RM, pesoMaximo, volumenSets } from '../../lib/workout'

export default function Progreso() {
  const [exerciseId, setExerciseId] = useState<number | null>(null)
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  const sets = useLiveQuery(() => (exerciseId ? db.sets.where('exerciseId').equals(exerciseId).toArray() : []), [exerciseId])
  const workouts = useLiveQuery(() => db.workouts.toArray(), [])

  const workoutMap = new Map((workouts ?? []).map((w) => [w.id!, w]))

  const porWorkout = new Map<number, typeof sets>()
  for (const s of sets ?? []) {
    const arr = porWorkout.get(s.workoutId) ?? []
    arr.push(s)
    porWorkout.set(s.workoutId, arr)
  }

  const datos = Array.from(porWorkout.entries())
    .map(([workoutId, ss]) => {
      const w = workoutMap.get(workoutId)
      if (!w) return null
      const mejores1RM = (ss ?? []).map((s) => epley1RM(s.peso, s.reps))
      return {
        fecha: new Date(w.inicio).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
        inicio: w.inicio,
        pesoMax: pesoMaximo(ss ?? []),
        oneRM: Math.max(0, ...mejores1RM),
        volumen: volumenSets(ss ?? []),
      }
    })
    .filter((d): d is NonNullable<typeof d> => d !== null)
    .sort((a, b) => a.inicio - b.inicio)

  return (
    <div className="space-y-4 pb-4">
      <select
        value={exerciseId ?? ''}
        onChange={(e) => setExerciseId(e.target.value ? Number(e.target.value) : null)}
        className="w-full rounded-xl bg-slate-900 px-3 py-2.5 text-slate-100"
      >
        <option value="">Elige un ejercicio…</option>
        {exercises?.map((e) => (
          <option key={e.id} value={e.id}>
            {e.nombre}
          </option>
        ))}
      </select>

      {exerciseId && datos.length === 0 && <p className="px-1 text-sm text-slate-500">Sin series registradas todavía para este ejercicio.</p>}

      {exerciseId && datos.length > 0 && (
        <>
          <div className="rounded-2xl bg-slate-900 p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-300">Peso máximo y 1RM estimado (kg)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={datos}>
                <XAxis dataKey="fecha" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={30} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#e2e8f0' }} />
                <Line type="monotone" dataKey="pesoMax" name="Peso máx" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="oneRM" name="1RM est." stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl bg-slate-900 p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-300">Volumen por sesión (kg totales)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={datos}>
                <XAxis dataKey="fecha" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={40} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#e2e8f0' }} />
                <Line type="monotone" dataKey="volumen" name="Volumen" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
