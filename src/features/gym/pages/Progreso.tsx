import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import * as exercisesRepo from '../data/exercisesRepo'
import * as setsRepo from '../data/setsRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import { epley1RM, pesoMaximo, volumenSets } from '../lib/workout'
import { chartAxis, chartColors, chartTooltip } from '../../../shared/design/chart'
import { Select } from '../../../shared/components/Input'
import Card from '../../../shared/components/Card'
import { EmptyState } from '../../../shared/components/StateMessage'

export default function Progreso() {
  const [exerciseId, setExerciseId] = useState<number | null>(null)
  const exercises = useLiveQuery(() => exercisesRepo.listar(), [])
  const sets = useLiveQuery(() => (exerciseId ? setsRepo.delEjercicio(exerciseId) : []), [exerciseId])
  const workouts = useLiveQuery(() => workoutsRepo.listar(), [])

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
      <Select
        tone="surface"
        value={exerciseId ?? ''}
        onChange={(e) => setExerciseId(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">Elige un ejercicio…</option>
        {exercises?.map((e) => (
          <option key={e.id} value={e.id}>
            {e.nombre}
          </option>
        ))}
      </Select>

      {exerciseId && datos.length === 0 && <EmptyState>Sin series registradas todavía para este ejercicio.</EmptyState>}

      {exerciseId && datos.length > 0 && (
        <>
          <Card>
            <h3 className="mb-3 text-body-sm font-semibold text-fg-muted">Peso máximo y 1RM estimado (kg)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={datos}>
                <XAxis dataKey="fecha" {...chartAxis} />
                <YAxis {...chartAxis} width={30} />
                <Tooltip {...chartTooltip} />
                <Line type="monotone" dataKey="pesoMax" name="Peso máx" stroke={chartColors.seriesPrimary} strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="oneRM" name="1RM est." stroke={chartColors.seriesSecondary} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h3 className="mb-3 text-body-sm font-semibold text-fg-muted">Volumen por sesión (kg totales)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={datos}>
                <XAxis dataKey="fecha" {...chartAxis} />
                <YAxis {...chartAxis} width={40} />
                <Tooltip {...chartTooltip} />
                <Line type="monotone" dataKey="volumen" name="Volumen" stroke={chartColors.seriesTertiary} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </div>
  )
}
