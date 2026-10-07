import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import * as exercisesRepo from '../data/exercisesRepo'
import * as setsRepo from '../data/setsRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import { efectivas, epley1RM, pesoMaximo, volumenSets } from '../lib/workout'
import { chartAxis, chartColors, chartTooltip } from '../../../shared/design/chart'
import { Select } from '../../../shared/components/Input'
import Metric from '../../../shared/components/Metric'
import SectionHeader from '../../../shared/components/SectionHeader'
import { formatCompact, formatInt, formatNumber } from '../../../shared/lib/format'
import Card from '../../../shared/components/Card'
import Disclosure from '../../../shared/components/Disclosure'
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
      const mejores1RM = efectivas(ss ?? []).map((s) => epley1RM(s.peso, s.reps))
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

  const ultimo = datos.length > 0 ? datos[datos.length - 1] : null

  return (
    <div className="space-y-section">
      <label className="block space-y-2"><span className="text-label text-fg-muted">Ejercicio</span>
        <Select tone="surface" aria-label="Ejercicio" value={exerciseId ?? ''} onChange={(e) => setExerciseId(e.target.value ? Number(e.target.value) : null)}>
          <option value="">Elige un ejercicio…</option>
          {exercises?.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </Select>
      </label>
      {!exerciseId && <EmptyState icon="dumbbell" title="Sigue tu evolución">Elige un ejercicio para comparar tus sesiones.</EmptyState>}
      {exerciseId && !datos.length && <EmptyState title="Aún sin series">Registra este ejercicio en un entreno para ver sus resultados.</EmptyState>}
      {exerciseId && ultimo && (
        <>
          <Card><section aria-label="Última sesión" className="space-y-5">
            <Metric size="hero" label="Peso máximo · última sesión" valor={formatNumber(ultimo.pesoMax, 1)} unidad="kg" caption={ultimo.fecha} />
            <div className="grid grid-cols-2 gap-4 border-y border-line py-4">
              <Metric size="title" label="1RM estimado" valor={formatNumber(ultimo.oneRM, 1)} unidad="kg" />
              <Metric size="title" label="Volumen total" valor={formatInt(ultimo.volumen)} unidad="kg" />
            </div>
            <p className="text-caption text-fg-muted">1RM estima el peso para una repetición. El volumen suma peso × repeticiones de todas las series.</p>
          </section></Card>
          {datos.length < 2 ? <p className="text-body-sm text-fg-muted">Registra otra sesión para ver la tendencia.</p> : <>
            <Card><section aria-label="Peso máximo y 1RM" className="space-y-4">
              <SectionHeader variant="section">Fuerza por sesión</SectionHeader>
              <div className="flex flex-wrap gap-4 text-caption text-fg-muted">
                <span className="flex items-center gap-2"><span aria-hidden className="h-0.5 w-4 bg-accent" />Peso máximo</span>
                <span className="flex items-center gap-2"><span aria-hidden className="w-4 border-t-2 border-dashed border-fg" />1RM estimado</span>
              </div>
              <div role="img" aria-label="Peso máximo y 1RM estimado en kg por sesión. Datos disponibles debajo.">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={datos} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <XAxis dataKey="fecha" {...chartAxis} minTickGap={20} /><YAxis {...chartAxis} width={56} tickFormatter={formatCompact} />
                    <Tooltip {...chartTooltip} formatter={(v) => `${formatNumber(Number(v), 1)} kg`} />
                    <Line type="linear" dataKey="pesoMax" name="Peso máximo" stroke={chartColors.seriesPrimary} strokeWidth={2} dot={datos.length < 15 ? { r: 3 } : false} isAnimationActive={false} />
                    <Line type="linear" dataKey="oneRM" name="1RM estimado" stroke={chartColors.seriesSecondary} strokeWidth={2} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section></Card>
            <Card><section aria-label="Volumen por sesión" className="space-y-4">
              <SectionHeader variant="section">Trabajo por sesión</SectionHeader>
              <p className="text-label text-fg-muted">Volumen total (kg)</p>
              <div role="img" aria-label="Volumen total en kg por sesión. Datos disponibles debajo.">
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={datos} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <XAxis dataKey="fecha" {...chartAxis} minTickGap={20} /><YAxis {...chartAxis} width={56} tickFormatter={formatCompact} />
                    <Tooltip {...chartTooltip} formatter={(v) => `${formatInt(Number(v))} kg`} />
                    <Line type="linear" dataKey="volumen" name="Volumen" stroke={chartColors.seriesTertiary} strokeWidth={2} dot={datos.length < 15 ? { r: 3 } : false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section></Card>
          </>}
          <Disclosure title={`Ver ${datos.length} ${datos.length === 1 ? 'sesión' : 'sesiones'}`}>
            <ul className="divide-y divide-line text-body-sm">
              {datos.map(d => <li key={d.inicio} className="space-y-1 py-3"><p className="font-semibold text-fg">{new Date(d.inicio).toLocaleDateString('es-ES')}</p><p className="tabular break-words text-fg-muted">Máximo {formatNumber(d.pesoMax, 1)} kg · 1RM {formatNumber(d.oneRM, 1)} kg · volumen {formatInt(d.volumen)} kg</p></li>)}
            </ul>
          </Disclosure>
        </>
      )}
    </div>
  )
}
