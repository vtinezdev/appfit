import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, normalizeName, type Exercise, type SetEntry, type Workout } from '../../db'
import { formatUltimaVez } from '../../lib/workout'
import NumberStepper from '../../components/NumberStepper'
import Sheet from '../../components/Sheet'

interface Props {
  workout: Workout
}

export default function EntrenoActivo({ workout }: Props) {
  const [buscandoEjercicio, setBuscandoEjercicio] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  const currentSets = useLiveQuery(() => db.sets.where('workoutId').equals(workout.id!).toArray(), [workout.id]) ?? []
  const allSets = useLiveQuery(() => db.sets.toArray(), []) ?? []
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? []
  const routine = useLiveQuery(() => (workout.routineId ? db.routines.get(workout.routineId) : undefined), [workout.routineId])

  const exerciseMap = new Map(exercises.map((e) => [e.id!, e]))

  const idsConSets = Array.from(new Set(currentSets.map((s) => s.exerciseId)))
  const idsRutina = routine?.exerciseIds ?? []
  const visibleIds = Array.from(new Set([...idsRutina, ...idsConSets]))

  const busquedaNorm = normalizeName(busqueda)
  const resultados = busquedaNorm ? exercises.filter((e) => e.nombreNorm.includes(busquedaNorm)) : exercises
  const existeExacto = exercises.some((e) => e.nombreNorm === busquedaNorm)

  function ultimaSetDeEjercicio(exerciseId: number, excluirWorkout: boolean): SetEntry | null {
    const candidatos = allSets.filter((s) => s.exerciseId === exerciseId && (!excluirWorkout || s.workoutId !== workout.id))
    if (candidatos.length === 0) return null
    return candidatos.reduce((a, b) => (a.createdAt > b.createdAt ? a : b))
  }

  async function agregarSet(exerciseId: number) {
    const setsDeEsteEjercicio = currentSets.filter((s) => s.exerciseId === exerciseId)
    const previa = ultimaSetDeEjercicio(exerciseId, false)
    await db.sets.add({
      workoutId: workout.id!,
      exerciseId,
      orden: setsDeEsteEjercicio.length,
      reps: previa?.reps ?? 8,
      peso: previa?.peso ?? 20,
      createdAt: Date.now(),
    })
  }

  async function actualizarSet(id: number, patch: Partial<Pick<SetEntry, 'reps' | 'peso'>>) {
    await db.sets.update(id, patch)
  }

  async function borrarSet(id: number) {
    await db.sets.delete(id)
  }

  async function elegirEjercicio(exercise: Exercise) {
    setBuscandoEjercicio(false)
    setBusqueda('')
    await agregarSet(exercise.id!)
  }

  async function crearYElegir() {
    const nombre = busqueda.trim()
    if (!nombre) return
    const id = await db.exercises.add({ nombre, nombreNorm: normalizeName(nombre), grupo: 'General' })
    setBuscandoEjercicio(false)
    setBusqueda('')
    await agregarSet(id)
  }

  async function terminar() {
    await db.workouts.update(workout.id!, { fin: Date.now() })
  }

  return (
    <div className="min-h-full px-4 pt-4 pb-28">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-100">Entreno en curso</h1>
        <button onClick={terminar} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
          Terminar
        </button>
      </div>

      <div className="space-y-4">
        {visibleIds.map((exId) => {
          const ex = exerciseMap.get(exId)
          if (!ex) return null
          const sets = currentSets.filter((s) => s.exerciseId === exId).sort((a, b) => a.orden - b.orden)
          const ultimaVez = ultimaSetDeEjercicio(exId, true)
          const historico = allSets.filter(
            (s) => s.exerciseId === exId && s.workoutId === ultimaVez?.workoutId,
          )

          return (
            <div key={exId} className="rounded-2xl bg-slate-900 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-medium text-slate-100">{ex.nombre}</h3>
                <span className="text-xs text-slate-500">
                  {historico.length > 0 ? `Última vez: ${formatUltimaVez(historico)}` : 'Sin datos previos'}
                </span>
              </div>
              <div className="space-y-2">
                {sets.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-1.5">
                    <span className="w-4 shrink-0 text-center text-xs text-slate-600">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <NumberStepper compact value={s.reps} onChange={(v) => actualizarSet(s.id!, { reps: v })} suffix="reps" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <NumberStepper compact value={s.peso} onChange={(v) => actualizarSet(s.id!, { peso: v })} step={2.5} suffix="kg" />
                    </div>
                    <button onClick={() => borrarSet(s.id!)} className="shrink-0 px-1 text-slate-600">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={() => agregarSet(exId)} className="mt-2 w-full rounded-lg bg-slate-800 py-2 text-sm font-medium text-brand-400">
                + Serie
              </button>
            </div>
          )
        })}
      </div>

      <button
        onClick={() => setBuscandoEjercicio(true)}
        className="mt-4 w-full rounded-2xl border-2 border-dashed border-slate-700 py-4 text-sm font-medium text-slate-400"
      >
        + Añadir ejercicio
      </button>

      <Sheet open={buscandoEjercicio} onClose={() => setBuscandoEjercicio(false)} title="Añadir ejercicio">
        <div className="space-y-3">
          <input
            autoFocus
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar o crear ejercicio…"
            className="w-full rounded-lg bg-slate-800 px-3 py-2.5 text-slate-100 placeholder:text-slate-600"
          />
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {resultados.map((ex) => (
              <button key={ex.id} onClick={() => elegirEjercicio(ex)} className="w-full rounded-lg bg-slate-800 px-3 py-2.5 text-left text-slate-100">
                {ex.nombre}
              </button>
            ))}
            {busqueda.trim() && !existeExacto && (
              <button onClick={crearYElegir} className="w-full rounded-lg bg-brand-600/20 px-3 py-2.5 text-left text-brand-400">
                Crear "{busqueda.trim()}"
              </button>
            )}
          </div>
        </div>
      </Sheet>
    </div>
  )
}
