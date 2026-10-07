import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import * as exercisesRepo from '../data/exercisesRepo'
import * as routinesRepo from '../data/routinesRepo'
import * as setsRepo from '../data/setsRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import type { SetEntry, Workout } from '../../../shared/db/types'
import { getSettings } from '../../../shared/db/settings'
import { pitar } from '../../../shared/lib/sonido'
import ConfirmacionDestructiva from '../../../shared/components/ConfirmacionDestructiva'
import PanelEjercicio from '../components/PanelEjercicio'
import { Textarea } from '../../../shared/components/Input'
import { recordsDeEntreno } from '../lib/records'
import SelectorEjercicios from '../components/SelectorEjercicios'
import type { SeleccionEjercicio } from '../lib/selectorEjercicios'
import { trabajoMuscularWorkout } from '../lib/cargaMuscular'
import { efectivas, formatHora, formatUltimaVez, moverElemento, ordenEjerciciosSesion, volumenSets } from '../lib/workout'
import { formatInt } from '../../../shared/lib/format'
import Sheet from '../../../shared/components/Sheet'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import { useAviso } from '../../../shared/hooks/useAviso'
import { useListMotion } from '../../../shared/hooks/useListMotion'
import { haptic } from '../../../shared/design/motion'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import ProgressBar from '../../../shared/components/ProgressBar'
import { clearSession, descansoParaEjercicio, readSession, writeSession } from '../lib/session'
import { RestClock, WorkoutClock } from '../components/WorkoutClock'
import type { WorkoutSummary } from '../components/WorkoutFinished'
import { ErrorState } from '../../../shared/components/StateMessage'
import Disclosure from '../../../shared/components/Disclosure'

interface Props {
  workout: Workout
  onFinished: (summary: WorkoutSummary) => void
}

export default function EntrenoActivo({ workout, onFinished }: Props) {
  const [buscandoEjercicio, setBuscandoEjercicio] = useState(false)
  const [session, setSession] = useState(() => readSession(workout.id!))
  const [confirmando, setConfirmando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [newSet, setNewSet] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  const [finishError, setFinishError] = useState<string | null>(null)
  const [restConfigOpen, setRestConfigOpen] = useState(false)
  const [descartando, setDescartando] = useState(false)
  const [notas, setNotas] = useState(workout.notas ?? '')
  const notasGuardadas = useRef(workout.notas ?? '')
  const restConfig = useRef<HTMLDivElement>(null)
  const pendingWrites = useRef(new Map<number, Promise<void>>())
  const { avisar, avisarError, toast } = useAviso()

  const currentSets = useLiveQuery(() => setsRepo.delWorkout(workout.id!), [workout.id]) ?? []
  const allSets = useLiveQuery(() => setsRepo.todas(), []) ?? []
  const exercises = useLiveQuery(() => exercisesRepo.listar(), []) ?? []
  const ajustes = useLiveQuery(() => getSettings(), [])
  const todosWorkouts = useLiveQuery(() => workoutsRepo.listar(), []) ?? []
  const routine = useLiveQuery(() => (workout.routineId ? routinesRepo.obtener(workout.routineId) : undefined), [workout.routineId])
  const listRef = useListMotion(`${currentSets.map(s => s.id).join(',')}|${session.restEndsAt !== null}|${restConfigOpen}`)
  useEffect(() => { writeSession(workout.id!, session) }, [workout.id, session])

  const exerciseMap = new Map(exercises.map((e) => [e.id!, e]))

  const idsConSets = Array.from(new Set([...currentSets].sort((a, b) => a.createdAt - b.createdAt).map((s) => s.exerciseId)))
  const idsRutina = routine?.exerciseIds ?? []
  const visibleIds = ordenEjerciciosSesion(idsRutina, idsConSets, workout.ordenEjercicios)

  async function guardarNotas() {
    if (notas === notasGuardadas.current) return
    try {
      await workoutsRepo.guardarNotas(workout.id!, notas)
      notasGuardadas.current = notas
    } catch {
      avisarError('No se han podido guardar las notas. Inténtalo de nuevo.')
    }
  }
  // Guardado con espera: tras dejar de escribir y siempre al salir del campo.
  useEffect(() => {
    if (notas === notasGuardadas.current) return
    const t = setTimeout(() => { void guardarNotas() }, 800)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notas])

  async function mover(indice: number, delta: -1 | 1) {
    try {
      await workoutsRepo.guardarOrden(workout.id!, moverElemento(visibleIds, indice, delta))
    } catch {
      avisarError('No se ha podido cambiar el orden. Inténtalo de nuevo.')
    }
  }

  async function descartar() {
    if (guardando) return
    setGuardando(true)
    setFinishError(null)
    try {
      await Promise.all(pendingWrites.current.values())
      clearSession(workout.id!)
      await workoutsRepo.descartar(workout.id!)
    } catch {
      setFinishError('No se ha podido descartar el entreno. Inténtalo de nuevo.')
      setGuardando(false)
    }
  }

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

  async function actualizarSet(id: number, patch: Partial<Pick<SetEntry, 'reps' | 'peso' | 'tipo' | 'rir'>>) {
    // Cambiar el tipo o el RIR no desmarca la serie; reps y peso sí.
    if ('reps' in patch || 'peso' in patch) setSession(previous => ({ ...previous, completed: previous.completed.filter(n => n !== id) }))
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
        avisar({ mensaje: numero > 0 ? `Serie ${numero} borrada` : 'Serie de calentamiento borrada', onDeshacer: async () => {
          await setsRepo.restaurar([set])
          if (completed) setSession(previous => ({ ...previous, completed: [...previous.completed, id] }))
        } })
      }
    } catch {
      avisarError('No se ha podido borrar la serie. Inténtalo de nuevo.')
    }
  }

  async function elegirEjercicio(value: SeleccionEjercicio) {
    setNewSet(await setsRepo.agregarSeleccion(workout.id!, value))
    haptic()
  }

  async function terminar() {
    if (guardando) return
    setGuardando(true)
    try {
      await Promise.all(pendingWrites.current.values())
      await guardarNotas()
      const finished = await workoutsRepo.terminar(workout.id!)
      const saved = finished.sets
      const guardadasEfectivas = efectivas(saved)
      clearSession(workout.id!)
      haptic('finish')
      const records = recordsDeEntreno(workout.id!, [...todosWorkouts.filter(w => w.id !== workout.id), finished.workout],
        [...allSets.filter(s => s.workoutId !== workout.id), ...saved])
      onFinished({
        seconds: ((finished.workout.fin ?? Date.now()) - workout.inicio) / 1000,
        exercises: new Set(guardadasEfectivas.map(s => s.exerciseId)).size,
        sets: guardadasEfectivas.length,
        volume: volumenSets(saved),
        muscle: trabajoMuscularWorkout(finished.workout, saved, []),
        records,
        nombres: Object.fromEntries(exercises.map(e => [e.id, e.nombre])),
      })
    } catch {
      setFinishError('No se ha podido terminar el entreno. Inténtalo de nuevo.')
      setConfirmando(true)
      setGuardando(false)
    }
  }

  const volumen = volumenSets(currentSets)
  const completedCount = currentSets.filter(s => session.completed.includes(s.id!)).length

  async function completar(s: SetEntry, numero: number) {
    const nombre = exerciseMap.get(s.exerciseId)?.nombre ?? 'ejercicio'
    try {
      await pendingWrites.current.get(s.id!)
      const done = session.completed.includes(s.id!)
      const descanso = descansoParaEjercicio(routine?.objetivos?.[s.exerciseId]?.descansoSeg, session.restSeconds)
      setSession(previous => ({
        ...previous,
        completed: done ? previous.completed.filter(id => id !== s.id) : [...previous.completed, s.id!],
        restEndsAt: done ? previous.restEndsAt : descanso > 0 ? Date.now() + descanso * 1000 : null,
        restTotal: done ? previous.restTotal : descanso > 0 ? descanso : undefined,
      }))
      haptic(done ? 'selection' : 'success')
      const que = numero > 0 ? `Serie ${numero}` : 'Calentamiento'
      setFeedback(done ? `${que} de ${nombre} pendiente` : `${que} de ${nombre} completada`)
    } catch { avisarError('La serie no se ha guardado. Inténtalo de nuevo antes de completarla.') }
  }

  return (
    <div className="space-y-section px-page pb-16 pt-5">
      <section aria-label="Entreno en curso" className="training-surface space-y-2 p-3">
        <div className="flex min-h-touch items-center justify-between gap-2">
          <div className="min-w-0"><h1 className="break-words text-heading">{routine?.nombre ?? 'Entreno libre'}</h1><p className="training-muted text-caption">En curso · {formatHora(workout.inicio)}</p></div>
          <Button size="sm" onClick={() => { setFinishError(null); setConfirmando(true) }}>
            Terminar
          </Button>
        </div>
        <div className="grid grid-cols-3 items-end gap-3">
          <div className="min-w-0"><p className="training-muted text-caption">Tiempo</p><p className="font-numeric text-heading"><WorkoutClock start={workout.inicio} /></p></div>
          <div className="min-w-0"><p className="training-muted text-caption">Volumen</p><p className="tabular break-words font-numeric text-heading">{formatInt(volumen)} <span className="training-muted text-caption">kg</span></p></div>
          <div className="min-w-0 text-right"><p className="training-muted text-caption">Series marcadas</p><p className="tabular font-numeric text-heading">{completedCount}<span className="training-muted text-body-sm"> / {currentSets.length}</span></p></div>
        </div>
        <div className="training-progress"><ProgressBar value={completedCount} goal={currentSets.length} label="Series completadas" valueText={`${completedCount} de ${currentSets.length} series marcadas`} /></div>
      </section>

      <section aria-label="Descanso entre series" className="space-y-2">
        {session.restEndsAt !== null ? <RestClock key={session.restEndsAt} endsAt={session.restEndsAt} duration={session.restTotal ?? session.restSeconds}
          onEnd={() => {
            setSession(previous => ({ ...previous, restEndsAt: null }))
            setFeedback('Descanso terminado. Listo para la siguiente serie.')
            haptic('success')
            if (ajustes?.sonidoDescanso !== false) pitar()
          }}
          onSkip={() => { setSession(previous => ({ ...previous, restEndsAt: null })); setFeedback('Descanso finalizado'); haptic() }} /> :
          <div ref={restConfig}><Disclosure title={`Descanso: ${session.restSeconds ? `${session.restSeconds} s` : 'sin temporizador'}`} open={restConfigOpen} onChange={setRestConfigOpen}>
            <div className="space-y-3">
              <SegmentedControl label="Duración del descanso" size="sm" valor={String(session.restSeconds)} onChange={value => {
                setSession(previous => ({ ...previous, restSeconds: Number(value), restEndsAt: null }))
                setRestConfigOpen(false)
                requestAnimationFrame(() => restConfig.current?.querySelector('button')?.focus({ preventScroll: true }))
              }} opciones={[{ valor: '0', label: 'No' }, { valor: '60', label: '60 s' }, { valor: '90', label: '90 s' }, { valor: '120', label: '120 s' }]} />
              <p className="text-caption text-fg-muted">Los ejercicios con descanso propio en la rutina usan ese tiempo. El aviso sonoro se ajusta en Ajustes y solo suena con la app abierta.</p>
            </div>
          </Disclosure></div>}
      </section>
      <p role="status" className="sr-only">{feedback}</p>

      <div ref={listRef} className="space-y-stack">
        {visibleIds.map((exId, indice) => {
          const ex = exerciseMap.get(exId)
          if (!ex) return null
          const sets = currentSets.filter((s) => s.exerciseId === exId).sort((a, b) => a.orden - b.orden)
          const ultimaVez = ultimaSetDeEjercicio(exId, true)
          const historico = allSets.filter((s) => s.exerciseId === exId && s.workoutId === ultimaVez?.workoutId)
          return (
            <div key={exId}>
              <PanelEjercicio ejercicio={ex} sets={sets} barraKg={ajustes?.barraKg ?? 20}
                ultimaVez={historico.length > 0 ? `Última vez: ${formatUltimaVez(historico)}` : 'Sin datos previos'}
                objetivo={routine?.objetivos?.[exId]} completadas={session.completed} onCompletar={completar} nuevaId={newSet} bloqueado={guardando}
                onActualizar={actualizarSet} onBorrar={borrarSet} onAgregar={() => agregarSet(exId)}
                mover={visibleIds.length > 1 ? { puedeSubir: indice > 0, puedeBajar: indice < visibleIds.length - 1, onSubir: () => mover(indice, -1), onBajar: () => mover(indice, 1) } : undefined} />
            </div>
          )
        })}
      </div>

      <p className="text-caption text-fg-muted">Introduce reps y toca el número de serie al completarla.</p>

      <Button variant="secondary" size="lg" block onClick={() => setBuscandoEjercicio(true)}>
        <Icon name="plus" size={20} />
        Añadir ejercicio
      </Button>

      <section aria-label="Notas del entreno">
        <label className="block space-y-1">
          <span className="text-label text-fg-muted">Notas del entreno</span>
          <Textarea rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} onBlur={() => { void guardarNotas() }} placeholder="Sensaciones, molestias, cambios…" />
        </label>
      </section>

      <section aria-label="Descartar entreno" className="space-y-2 border-t border-line pt-3">
        {descartando ? (
          <ConfirmacionDestructiva mensaje={`¿Descartar este entreno? Se borran sus ${currentSets.length} series y no se guarda en el historial. No se puede deshacer.`}
            confirmar="Sí, descartar" onConfirmar={descartar} onCancelar={() => setDescartando(false)} ocupado={guardando} />
        ) : <Button variant="destructive" block onClick={() => { setFinishError(null); setDescartando(true) }}>Descartar entreno</Button>}
        {!confirmando && finishError && <ErrorState>{finishError}</ErrorState>}
      </section>

      <Sheet open={confirmando} onClose={() => setConfirmando(false)} title="Terminar entreno">
        <div className="space-y-4">
          {currentSets.length === 0
            ? <p className="text-body-sm text-fg-muted">No hay series registradas, así que no hay nada que guardar: al terminar se descartará este entreno.</p>
            : <p className="text-body-sm text-fg-muted">Se guardarán las {currentSets.length} series registradas, incluidas las que no has marcado. Podrás consultar la sesión en el historial.</p>}
          {finishError && <ErrorState>{finishError}</ErrorState>}
          {currentSets.length === 0
            ? <Button block size="lg" variant="danger" loading={guardando} onClick={descartar}>Descartar entreno</Button>
            : <Button block size="lg" loading={guardando} onClick={terminar}>Guardar y terminar</Button>}
          <Button variant="ghost" block disabled={guardando} onClick={() => setConfirmando(false)}>Seguir entrenando</Button>
        </div>
      </Sheet>

      {buscandoEjercicio && <SelectorEjercicios onClose={() => setBuscandoEjercicio(false)} onElegir={elegirEjercicio} />}

      {toast}
    </div>
  )
}
