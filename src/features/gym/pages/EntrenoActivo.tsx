import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import * as exercisesRepo from '../data/exercisesRepo'
import * as routinesRepo from '../data/routinesRepo'
import * as setsRepo from '../data/setsRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import type { Exercise, SetEntry, Workout } from '../../../shared/db/types'
import { normalizeName } from '../../../shared/lib/text'
import { formatHora, formatUltimaVez, volumenSets } from '../lib/workout'
import { formatInt } from '../../../shared/lib/format'
import Sheet from '../../../shared/components/Sheet'
import Button, { IconButton } from '../../../shared/components/Button'
import ListRow from '../../../shared/components/ListRow'
import { Input, SearchInput } from '../../../shared/components/Input'
import Icon from '../../../shared/components/Icon'
import Card from '../../../shared/components/Card'
import { useAviso } from '../../../shared/hooks/useAviso'
import { useListMotion } from '../../../shared/hooks/useListMotion'
import { haptic } from '../../../shared/design/motion'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import ProgressBar from '../../../shared/components/ProgressBar'
import { clearSession, readSession, writeSession } from '../lib/session'
import { RestClock, WorkoutClock } from '../components/WorkoutClock'
import type { WorkoutSummary } from '../components/WorkoutFinished'
import { ErrorState } from '../../../shared/components/StateMessage'
import Disclosure from '../../../shared/components/Disclosure'

interface Props {
  workout: Workout
  onFinished: (summary: WorkoutSummary) => void
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

export default function EntrenoActivo({ workout, onFinished }: Props) {
  const [buscandoEjercicio, setBuscandoEjercicio] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [session, setSession] = useState(() => readSession(workout.id!))
  const [confirmando, setConfirmando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [newSet, setNewSet] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  const [finishError, setFinishError] = useState<string | null>(null)
  const [restConfigOpen, setRestConfigOpen] = useState(false)
  const restConfig = useRef<HTMLDivElement>(null)
  const pendingWrites = useRef(new Map<number, Promise<void>>())
  const { avisar, avisarError, toast } = useAviso()

  const currentSets = useLiveQuery(() => setsRepo.delWorkout(workout.id!), [workout.id]) ?? []
  const allSets = useLiveQuery(() => setsRepo.todas(), []) ?? []
  const exercises = useLiveQuery(() => exercisesRepo.listar(), []) ?? []
  const routine = useLiveQuery(() => (workout.routineId ? routinesRepo.obtener(workout.routineId) : undefined), [workout.routineId])
  const listRef = useListMotion(`${currentSets.map(s => s.id).join(',')}|${session.restEndsAt !== null}|${restConfigOpen}`)
  useEffect(() => { writeSession(workout.id!, session) }, [workout.id, session])

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
      setNewSet(await setsRepo.agregar(workout.id!, exerciseId))
      haptic()
    } catch {
      avisarError('No se ha podido añadir la serie. Inténtalo de nuevo.')
    }
  }

  async function actualizarSet(id: number, patch: Partial<Pick<SetEntry, 'reps' | 'peso'>>) {
    setSession(previous => ({ ...previous, completed: previous.completed.filter(n => n !== id) }))
    const operation = setsRepo.actualizar(id, patch)
    pendingWrites.current.set(id, operation)
    try {
      await operation
    } catch {
      avisarError('No se ha podido guardar la serie. Inténtalo de nuevo.')
    } finally {
      if (pendingWrites.current.get(id) === operation) pendingWrites.current.delete(id)
    }
  }

  async function borrarSet(id: number, numero: number) {
    try {
      const set = await setsRepo.borrar(id)
      if (set) {
        const completed = session.completed.includes(id)
        setSession(previous => ({ ...previous, completed: previous.completed.filter(n => n !== id) }))
        haptic()
        avisar({ mensaje: `Serie ${numero} borrada`, onDeshacer: async () => {
          await setsRepo.restaurar([set])
          if (completed) setSession(previous => ({ ...previous, completed: [...previous.completed, id] }))
        } })
      }
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
      setNewSet(await setsRepo.agregarConEjercicio(workout.id!, nombre))
      haptic()
    } catch {
      avisarError('No se ha podido crear el ejercicio. Inténtalo de nuevo.')
    }
  }

  async function terminar() {
    if (guardando) return
    setGuardando(true)
    try {
      await Promise.all(pendingWrites.current.values())
      const saved = await setsRepo.delWorkout(workout.id!)
      await workoutsRepo.terminar(workout.id!)
      clearSession(workout.id!)
      haptic('finish')
      onFinished({ seconds: (Date.now() - workout.inicio) / 1000, exercises: new Set(saved.map(s => s.exerciseId)).size, sets: saved.length, volume: volumenSets(saved) })
    } catch {
      setFinishError('No se ha podido terminar el entreno. Inténtalo de nuevo.')
      setConfirmando(true)
      setGuardando(false)
    }
  }

  const volumen = volumenSets(currentSets)
  const completedCount = currentSets.filter(s => session.completed.includes(s.id!)).length

  async function completar(s: SetEntry, numero: number, nombre: string) {
    try {
      await pendingWrites.current.get(s.id!)
      const done = session.completed.includes(s.id!)
      setSession(previous => ({ ...previous, completed: done ? previous.completed.filter(id => id !== s.id) : [...previous.completed, s.id!],
        restEndsAt: done ? previous.restEndsAt : previous.restSeconds > 0 ? Date.now() + previous.restSeconds * 1000 : null }))
      haptic(done ? 'selection' : 'success')
      setFeedback(done ? `Serie ${numero} de ${nombre} pendiente` : `Serie ${numero} de ${nombre} completada`)
    } catch { avisarError('La serie no se ha guardado. Inténtalo de nuevo antes de completarla.') }
  }

  return (
    <div className="space-y-section px-page pt-5">
      <section aria-label="Entreno en curso" className="training-surface space-y-2 p-3">
        <div className="flex min-h-touch items-center justify-between gap-2">
          <div className="min-w-0"><h1 className="break-words text-heading">{routine?.nombre ?? 'Entreno libre'}</h1><p className="training-muted text-caption">En curso · {formatHora(workout.inicio)}</p></div>
          <Button size="sm" onClick={() => { setFinishError(null); setConfirmando(true) }}>
            Terminar
          </Button>
        </div>
        <div className="grid grid-cols-3 items-end gap-3">
          <div className="min-w-0"><p className="training-muted text-caption">Tiempo</p><p className="text-heading font-extrabold"><WorkoutClock start={workout.inicio} /></p></div>
          <div className="min-w-0"><p className="training-muted text-caption">Volumen</p><p className="tabular break-words text-title font-bold">{formatInt(volumen)} <span className="training-muted text-caption">kg</span></p></div>
          <div className="min-w-0 text-right"><p className="training-muted text-caption">Series marcadas</p><p className="tabular text-title font-bold">{completedCount}<span className="training-muted text-body-sm"> / {currentSets.length}</span></p></div>
        </div>
        <div className="training-progress"><ProgressBar value={completedCount} goal={currentSets.length} label="Series completadas" valueText={`${completedCount} de ${currentSets.length} series marcadas`} /></div>
      </section>

      <section aria-label="Descanso entre series" className="space-y-2">
        {session.restEndsAt !== null ? <RestClock key={session.restEndsAt} endsAt={session.restEndsAt} duration={session.restSeconds}
          onEnd={() => { setSession(previous => ({ ...previous, restEndsAt: null })); setFeedback('Descanso terminado. Listo para la siguiente serie.'); haptic('success') }}
          onSkip={() => { setSession(previous => ({ ...previous, restEndsAt: null })); setFeedback('Descanso finalizado'); haptic() }} /> :
          <div ref={restConfig}><Disclosure title={`Descanso: ${session.restSeconds ? `${session.restSeconds} s` : 'sin temporizador'}`} open={restConfigOpen} onChange={setRestConfigOpen}>
            <SegmentedControl label="Duración del descanso" size="sm" valor={String(session.restSeconds)} onChange={value => {
              setSession(previous => ({ ...previous, restSeconds: Number(value), restEndsAt: null }))
              setRestConfigOpen(false)
              requestAnimationFrame(() => restConfig.current?.querySelector('button')?.focus({ preventScroll: true }))
            }} opciones={[{ valor: '0', label: 'No' }, { valor: '60', label: '60 s' }, { valor: '90', label: '90 s' }, { valor: '120', label: '120 s' }]} />
          </Disclosure></div>}
      </section>
      <p role="status" className="sr-only">{feedback}</p>

      <div ref={listRef} className="space-y-stack">
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
                  <div className="series-row text-caption text-fg-muted" aria-hidden>
                    <span className="text-center">Serie</span><span className="text-center">Reps</span><span className="text-center">Kg</span><span />
                  </div>
                )}
                {sets.map((s, i) => (
                  <div key={s.id} data-motion-id={s.id} data-done={session.completed.includes(s.id!)} className={`series-row ${newSet === s.id ? 'series-new' : ''}`}>
                    <button type="button" className="series-complete app-button tabular text-label font-bold"
                      aria-label={`${session.completed.includes(s.id!) ? 'Desmarcar' : 'Completar'} serie ${i + 1} de ${ex.nombre}`} aria-pressed={session.completed.includes(s.id!)}
                      disabled={s.reps <= 0 || guardando} title={s.reps <= 0 ? 'Introduce las repeticiones para completar la serie' : undefined} onClick={() => completar(s, i + 1, ex.nombre)}>
                      {session.completed.includes(s.id!) ? <Icon name="check" className="mx-auto" size={20} /> : i + 1}
                    </button>
                    <div className="min-w-0 flex-1">
                      <CampoSerie valor={s.reps} label={`Repeticiones, serie ${i + 1} de ${ex.nombre}`} onChange={(reps) => actualizarSet(s.id!, { reps })} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CampoSerie valor={s.peso} label={`Peso en kg, serie ${i + 1} de ${ex.nombre}`} decimal onChange={(peso) => actualizarSet(s.id!, { peso })} />
                    </div>
                    <IconButton icon="trash" label={`Borrar serie ${i + 1}`} variant="ghost" size="sm" onClick={() => borrarSet(s.id!, i + 1)} />
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

      <p className="text-caption text-fg-muted">Introduce reps y toca el número de serie al completarla.</p>

      <Button variant="secondary" size="lg" block onClick={() => setBuscandoEjercicio(true)}>
        <Icon name="plus" size={20} />
        Añadir ejercicio
      </Button>

      <Sheet open={confirmando} onClose={() => setConfirmando(false)} title="Terminar entreno">
        <div className="space-y-4"><p className="text-body-sm text-fg-muted">Se guardarán las {currentSets.length} series registradas, incluidas las que no has marcado. Podrás consultar la sesión en el historial.</p>
          {finishError && <ErrorState>{finishError}</ErrorState>}
          <Button block size="lg" loading={guardando} onClick={terminar}>Guardar y terminar</Button>
          <Button variant="ghost" block disabled={guardando} onClick={() => setConfirmando(false)}>Seguir entrenando</Button>
        </div>
      </Sheet>

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
