import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import * as exercisesRepo from '../data/exercisesRepo'
import * as routinesRepo from '../data/routinesRepo'
import * as setsRepo from '../data/setsRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import type { Exercise, SetEntry, Workout } from '../../../shared/db/types'
import { normalizeName } from '../../../shared/lib/text'
import { formatUltimaVez } from '../lib/workout'
import NumberStepper from '../../../shared/components/NumberStepper'
import Sheet from '../../../shared/components/Sheet'
import Button, { IconButton } from '../../../shared/components/Button'
import ListRow from '../../../shared/components/ListRow'
import { Input } from '../../../shared/components/Input'
import Icon from '../../../shared/components/Icon'
import Card from '../../../shared/components/Card'
import { useAviso } from '../../../shared/hooks/useAviso'

interface Props {
  workout: Workout
}

export default function EntrenoActivo({ workout }: Props) {
  const [buscandoEjercicio, setBuscandoEjercicio] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const { avisar, avisarError, toast } = useAviso()

  const currentSets = useLiveQuery(() => setsRepo.delWorkout(workout.id!), [workout.id]) ?? []
  const allSets = useLiveQuery(() => setsRepo.todas(), []) ?? []
  const exercises = useLiveQuery(() => exercisesRepo.listar(), []) ?? []
  const routine = useLiveQuery(() => (workout.routineId ? routinesRepo.obtener(workout.routineId) : undefined), [workout.routineId])

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
    try {
      await setsRepo.agregar(workout.id!, exerciseId)
    } catch {
      avisarError('No se ha podido añadir la serie. Inténtalo de nuevo.')
    }
  }

  async function actualizarSet(id: number, patch: Partial<Pick<SetEntry, 'reps' | 'peso'>>) {
    try {
      await setsRepo.actualizar(id, patch)
    } catch {
      avisarError('No se ha podido guardar la serie. Inténtalo de nuevo.')
    }
  }

  async function borrarSet(id: number, numero: number) {
    try {
      const set = await setsRepo.borrar(id)
      if (set) avisar({ mensaje: `Serie ${numero} borrada`, onDeshacer: () => setsRepo.restaurar([set]) })
    } catch {
      avisarError('No se ha podido borrar la serie. Inténtalo de nuevo.')
    }
  }

  async function elegirEjercicio(exercise: Exercise) {
    setBuscandoEjercicio(false)
    setBusqueda('')
    await agregarSet(exercise.id!)
  }

  async function crearYElegir() {
    const nombre = busqueda.trim()
    if (!nombre) return
    setBuscandoEjercicio(false)
    setBusqueda('')
    try {
      await setsRepo.agregarConEjercicio(workout.id!, nombre)
    } catch {
      avisarError('No se ha podido crear el ejercicio. Inténtalo de nuevo.')
    }
  }

  async function terminar() {
    try {
      await workoutsRepo.terminar(workout.id!)
    } catch {
      avisarError('No se ha podido terminar el entreno. Inténtalo de nuevo.')
    }
  }

  return (
    <div className="min-h-full px-4 pt-4 pb-28">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-title font-semibold text-fg">Entreno en curso</h1>
        <Button onClick={terminar}>Terminar</Button>
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
            <Card key={exId}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-medium text-fg">{ex.nombre}</h3>
                <span className="text-caption text-fg-subtle">
                  {historico.length > 0 ? `Última vez: ${formatUltimaVez(historico)}` : 'Sin datos previos'}
                </span>
              </div>
              <div className="space-y-2">
                {sets.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-1.5">
                    <span className="w-4 shrink-0 text-center text-caption text-fg-subtle">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <NumberStepper compact value={s.reps} onChange={(v) => actualizarSet(s.id!, { reps: v })} suffix="reps" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <NumberStepper compact value={s.peso} onChange={(v) => actualizarSet(s.id!, { peso: v })} step={2.5} suffix="kg" />
                    </div>
                    <IconButton icon="close" label={`Borrar serie ${i + 1}`} variant="ghost" size="sm" onClick={() => borrarSet(s.id!, i + 1)} />
                  </div>
                ))}
              </div>
              <Button variant="ghost" block className="mt-1" onClick={() => agregarSet(exId)}>
                <Icon name="plus" size={16} />
                Serie
              </Button>
            </Card>
          )
        })}
      </div>

      <button
        onClick={() => setBuscandoEjercicio(true)}
        className="mt-4 w-full rounded-lg border-2 border-dashed border-line-strong py-4 text-body-sm font-medium text-fg-muted"
      >
        + Añadir ejercicio
      </button>

      <Sheet open={buscandoEjercicio} onClose={() => setBuscandoEjercicio(false)} title="Añadir ejercicio">
        <div className="space-y-3">
          <Input
            autoFocus
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar o crear ejercicio…"
          />
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {resultados.map((ex) => (
              <ListRow tone="muted" key={ex.id} onClick={() => elegirEjercicio(ex)}>
                {ex.nombre}
              </ListRow>
            ))}
            {busqueda.trim() && !existeExacto && (
              <ListRow tone="accent" onClick={crearYElegir}>
                Crear "{busqueda.trim()}"
              </ListRow>
            )}
          </div>
        </div>
      </Sheet>

      {toast}
    </div>
  )
}
