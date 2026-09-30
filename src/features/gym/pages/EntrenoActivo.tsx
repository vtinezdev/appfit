import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import * as exercisesRepo from '../data/exercisesRepo'
import * as routinesRepo from '../data/routinesRepo'
import * as setsRepo from '../data/setsRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import type { Exercise, SetEntry, Workout } from '../../../shared/db/types'
import { normalizeName } from '../../../shared/lib/text'
import { formatHora, formatUltimaVez, volumenSets } from '../lib/workout'
import { formatInt } from '../../../shared/lib/format'
import Metric from '../../../shared/components/Metric'
import NumberStepper from '../../../shared/components/NumberStepper'
import Sheet from '../../../shared/components/Sheet'
import Button, { IconButton } from '../../../shared/components/Button'
import ListRow from '../../../shared/components/ListRow'
import { SearchInput } from '../../../shared/components/Input'
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

  const volumen = volumenSets(currentSets)

  return (
    <div className="min-h-full space-y-section px-page pt-6">
      <Card tone="ink" role="region" aria-label="Entreno en curso" className="space-y-5">
        <div className="flex min-h-touch items-center justify-between gap-2">
          <h1 className="text-label uppercase text-fg-subtle">Entreno en curso</h1>
          <Button variant="contrast" size="sm" onClick={terminar}>
            Terminar
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Metric size="title" label="Inicio" valor={formatHora(workout.inicio)} />
          <Metric size="title" label="Series" valor={formatInt(currentSets.length)} />
          <Metric size="title" label="Volumen" valor={formatInt(volumen)} unidad="kg" />
        </div>
      </Card>

      <div className="space-y-stack">
        {visibleIds.map((exId) => {
          const ex = exerciseMap.get(exId)
          if (!ex) return null
          const sets = currentSets.filter((s) => s.exerciseId === exId).sort((a, b) => a.orden - b.orden)
          const ultimaVez = ultimaSetDeEjercicio(exId, true)
          const historico = allSets.filter(
            (s) => s.exerciseId === exId && s.workoutId === ultimaVez?.workoutId,
          )

          return (
            <Card key={exId} className="space-y-3">
              <div>
                <h2 className="text-title text-fg">{ex.nombre}</h2>
                <p className="text-caption text-fg-muted">
                  {historico.length > 0 ? `Última vez: ${formatUltimaVez(historico)}` : 'Sin datos previos'}
                </p>
              </div>
              <div className="space-y-2">
                {sets.length > 0 && (
                  <div className="flex items-center gap-1.5 text-label uppercase text-fg-subtle" aria-hidden>
                    <span className="w-4 shrink-0 text-center">Serie</span>
                    <span className="min-w-0 flex-1 text-center">Reps</span>
                    <span className="min-w-0 flex-1 text-center">Kg</span>
                    <span className="w-9 shrink-0" />
                  </div>
                )}
                {sets.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-1.5">
                    <span className="tabular w-4 shrink-0 text-center text-caption text-fg-muted">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <NumberStepper compact label="repeticiones" value={s.reps} onChange={(v) => actualizarSet(s.id!, { reps: v })} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <NumberStepper compact label="peso en kg" value={s.peso} onChange={(v) => actualizarSet(s.id!, { peso: v })} step={2.5} />
                    </div>
                    <IconButton icon="close" label={`Borrar serie ${i + 1}`} variant="ghost" size="sm" onClick={() => borrarSet(s.id!, i + 1)} />
                  </div>
                ))}
              </div>
              <Button variant="ghost" block onClick={() => agregarSet(exId)}>
                <Icon name="plus" size={16} />
                Serie
              </Button>
            </Card>
          )
        })}
      </div>

      <Button variant="secondary" size="lg" block onClick={() => setBuscandoEjercicio(true)}>
        <Icon name="plus" size={20} />
        Añadir ejercicio
      </Button>

      <Sheet open={buscandoEjercicio} onClose={() => setBuscandoEjercicio(false)} title="Añadir ejercicio">
        <div className="space-y-3">
          <SearchInput
            autoFocus
            aria-label="Buscar o crear ejercicio"
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
                Crear «{busqueda.trim()}»
              </ListRow>
            )}
          </div>
        </div>
      </Sheet>

      {toast}
    </div>
  )
}
