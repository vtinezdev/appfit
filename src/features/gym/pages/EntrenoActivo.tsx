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
import Sheet from '../../../shared/components/Sheet'
import Button, { IconButton } from '../../../shared/components/Button'
import ListRow from '../../../shared/components/ListRow'
import { Input, SearchInput } from '../../../shared/components/Input'
import Icon from '../../../shared/components/Icon'
import Card from '../../../shared/components/Card'
import { useAviso } from '../../../shared/hooks/useAviso'

interface Props {
  workout: Workout
}

/** El borrador evita que una respuesta asíncrona anterior interrumpa la escritura. */
function CampoSerie({ valor, label, decimal = false, onChange }: {
  valor: number
  label: string
  decimal?: boolean
  onChange: (valor: number) => void
}) {
  const [borrador, setBorrador] = useState<string | null>(null)
  return (
    <Input type="number" inputMode={decimal ? 'decimal' : 'numeric'} enterKeyHint={decimal ? 'done' : 'next'}
      min={0} step={decimal ? 2.5 : 1} aria-label={label} value={borrador ?? valor}
      onFocus={() => setBorrador(String(valor))}
      onChange={(e) => {
        const texto = e.target.value
        setBorrador(texto)
        if (texto !== '') onChange(Math.round(Math.max(0, Number(texto) || 0) * 100) / 100)
      }}
      onBlur={() => {
        if (borrador === '') onChange(0)
        setBorrador(null)
      }}
      className="tabular no-spin text-center font-semibold"
    />
  )
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
    <div className="space-y-section px-page pt-5">
      <section aria-label="Entreno en curso" className="space-y-4 border-b border-line pb-5">
        <div className="flex min-h-touch items-center justify-between gap-2">
          <h1 className="text-heading text-fg">Entreno en curso</h1>
          <Button variant="secondary" size="sm" onClick={terminar}>
            Terminar
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Metric size="title" label="Inicio" valor={formatHora(workout.inicio)} />
          <Metric size="title" label="Series" valor={formatInt(currentSets.length)} />
          <Metric size="title" label="Volumen" valor={formatInt(volumen)} unidad="kg" />
        </div>
      </section>

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
                <h2 className="break-words text-title text-fg">{ex.nombre}</h2>
                <p className="text-caption text-fg-muted">
                  {historico.length > 0 ? `Última vez: ${formatUltimaVez(historico)}` : 'Sin datos previos'}
                </p>
              </div>
              <div className="space-y-2">
                {sets.length > 0 && (
                  <div className="flex items-center gap-2 text-caption text-fg-muted" aria-hidden>
                    <span className="w-6 shrink-0 text-center">N.º</span>
                    <span className="min-w-0 flex-1 text-center">Reps</span>
                    <span className="min-w-0 flex-1 text-center">Peso (kg)</span>
                    <span className="w-touch shrink-0" />
                  </div>
                )}
                {sets.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <span className="tabular w-6 shrink-0 text-center text-label text-fg-muted">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <CampoSerie valor={s.reps} label={`Repeticiones, serie ${i + 1} de ${ex.nombre}`} onChange={(reps) => actualizarSet(s.id!, { reps })} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CampoSerie valor={s.peso} label={`Peso en kg, serie ${i + 1} de ${ex.nombre}`} decimal onChange={(peso) => actualizarSet(s.id!, { peso })} />
                    </div>
                    <IconButton icon="close" label={`Borrar serie ${i + 1}`} variant="ghost" size="sm" onClick={() => borrarSet(s.id!, i + 1)} />
                  </div>
                ))}
              </div>
              <Button variant="ghost" block onClick={() => agregarSet(exId)}>
                <Icon name="plus" size={16} />
                Añadir serie
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
          <div className="divide-y divide-line">
            {resultados.map((ex) => (
              <ListRow tone="flat" key={ex.id} onClick={() => elegirEjercicio(ex)}>
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
