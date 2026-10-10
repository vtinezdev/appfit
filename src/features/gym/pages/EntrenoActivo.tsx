import { recomendarProgresion } from '../lib/progresion'
import { convencional, tieneReps, cambiaRealizacion } from '../lib/ejecucion'
import { anterioresPorSerie, seriesSesionAnterior } from '../lib/anterior'
import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import * as exercisesRepo from '../data/exercisesRepo'
import * as routinesRepo from '../data/routinesRepo'
import * as setsRepo from '../data/setsRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import type { ConfiguracionCarga, SetEntry, Workout } from '../../../shared/db/types'
import { getSettings } from '../../../shared/db/settings'
import { pitar } from '../../../shared/lib/sonido'
import ConfirmacionDestructiva from '../../../shared/components/ConfirmacionDestructiva'
import PanelEjercicio from '../components/PanelEjercicio'
import { Textarea } from '../../../shared/components/Input'
import { recordsDeEntreno } from '../lib/records'
import SelectorEjercicios from '../components/SelectorEjercicios'
import type { SeleccionEjercicio } from '../lib/selectorEjercicios'
import { trabajoMuscularWorkout } from '../lib/cargaMuscular'
import { efectivas, formatHora, moverElemento, ordenEjerciciosSesion, volumenSets } from '../lib/workout'
import { formatInt } from '../../../shared/lib/format'
import Sheet from '../../../shared/components/Sheet'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import { useAviso } from '../../../shared/hooks/useAviso'
import { useListMotion } from '../../../shared/hooks/useListMotion'
import { haptic } from '../../../shared/design/motion'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import ProgressBar from '../../../shared/components/ProgressBar'
import { ajustarDescanso, clearSession, descansoParaEjercicio, readSession, writeSession } from '../lib/session'
import { RestClock, WorkoutClock } from '../components/WorkoutClock'
import type { WorkoutSummary } from '../components/WorkoutFinished'
import { ErrorState } from '../../../shared/components/StateMessage'
import Disclosure from '../../../shared/components/Disclosure'
import { useQuitarEjercicio } from '../hooks/useQuitarEjercicio'
import { todayISO } from '../../../shared/lib/dates'
import { useLigasSesion } from '../../liga/hooks/useLigasSesion'
import { avisarElite } from '../../liga/lib/basicos'
import { alternativas } from '../../liga/lib/alternativas'

interface Props {
  workout: Workout
  onFinished: (summary: WorkoutSummary) => void
}

export default function EntrenoActivo({ workout, onFinished }: Props) {
  const [buscandoEjercicio, setBuscandoEjercicio] = useState(false)
  const [session, setSession] = useState(() => readSession(workout.id!))
  const sessionActual = useRef(session)
  sessionActual.current = session
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
  const confirmandoSeries = useRef(new Set<number>())
  const pendingWrites = useRef(new Map<number, Promise<void>>())
  const { avisar, avisarError, toast } = useAviso()

  const seriesCargadas = useLiveQuery(() => setsRepo.delWorkout(workout.id!), [workout.id])
  const currentSets = seriesCargadas ?? []
  const allSets = useLiveQuery(() => setsRepo.todas(), []) ?? []
  const exercises = useLiveQuery(() => exercisesRepo.listar(), []) ?? []
  const ajustes = useLiveQuery(() => getSettings(), [])
  const todosWorkouts = useLiveQuery(() => workoutsRepo.listar(), []) ?? []
  const routine = useLiveQuery(() => (workout.routineId ? routinesRepo.obtener(workout.routineId) : undefined), [workout.routineId])
  const hoy = todayISO()
  const ligas = useLigasSesion(hoy, todosWorkouts, allSets, ajustes)
  const listRef = useListMotion(`${currentSets.map(s => s.id).join(',')}|${restConfigOpen}`)
  useEffect(() => { writeSession(workout.id!, session) }, [workout.id, session])

  const exerciseMap = new Map(exercises.map((e) => [e.id!, e]))

  const idsConSets = Array.from(new Set([...currentSets].sort((a, b) => a.createdAt - b.createdAt).map((s) => s.exerciseId)))
  const idsRutina = routine?.exerciseIds ?? []
  const visibleIds = ordenEjerciciosSesion(idsRutina, idsConSets, workout.ordenEjercicios, workout.ejerciciosOmitidos)
  const { quitarEjercicio, quitando, contenedorRef } = useQuitarEjercicio({
    workoutId: workout.id, visibleIds, bloqueado: guardando, avisar, avisarError,
    antesDeQuitar: async () => { await Promise.all(pendingWrites.current.values()) },
    alQuitar: captura => {
      const ids = new Set(captura.sets.map(s => s.id))
      const completadas = sessionActual.current.completed.filter(id => ids.has(id))
      setSession(previous => ({ ...previous, completed: previous.completed.filter(id => !ids.has(id)) }))
      return () => setSession(previous => ({ ...previous, completed: [...new Set([...previous.completed, ...completadas])] }))
    },
  })

  async function guardarNotas() {
    if (notas === notasGuardadas.current) return
    try {
      await workoutsRepo.guardarNotas(workout.id!, notas)
      notasGuardadas.current = notas
    } catch {
      avisarError('No se han podido guardar las notas. Inténtalo de nuevo.')
    }
  }

  async function guardarCarga(exerciseId: number, carga: ConfiguracionCarga) {
    setGuardando(true)
    try {
      await Promise.all(pendingWrites.current.values())
      const ids = new Set(await workoutsRepo.configurarCarga(workout.id, exerciseId, carga))
      setSession(previous => ({ ...previous, completed: previous.completed.filter(id => !ids.has(id)) }))
    } finally { setGuardando(false) }
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



  async function agregarSet(exerciseId: number) {
    try {
      setNewSet(await setsRepo.agregar(workout.id!, exerciseId))
      haptic()
    } catch {
      avisarError('No se ha podido añadir la serie. Inténtalo de nuevo.')
    }
  }

  async function actualizarSet(id: number, cambio: setsRepo.CambioSerie) {
    // Cambiar el tipo o el RIR no desmarca la serie; reps y peso sí.
    if (currentSets.some(s => s.id === id && cambiaRealizacion(s, typeof cambio === 'function' ? cambio(s) : cambio))) setSession(previous => ({ ...previous, completed: previous.completed.filter(n => n !== id) }))
    const operation = setsRepo.actualizar(id, cambio)
    pendingWrites.current.set(id, operation)
    try {
      await operation
    } catch {
      avisarError('No se ha podido guardar la serie. Inténtalo de nuevo.'); throw new Error('No se ha podido guardar la serie. Inténtalo de nuevo.')
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
      const finished = await workoutsRepo.terminar(workout.id!, sessionActual.current.completed)
      const saved = finished.sets
      const guardadasEfectivas = efectivas(saved)
      clearSession(workout.id!)
      haptic('finish')
      const records = recordsDeEntreno(workout.id!, [...todosWorkouts.filter(w => w.id !== workout.id), finished.workout],
        [...allSets.filter(s => s.workoutId !== workout.id), ...saved])
      onFinished({
        titulo: routine?.nombre ?? 'Entreno libre',
        inicio: workout.inicio,
        fin: finished.workout.fin ?? Date.now(),
        sets: guardadasEfectivas.length,
        volume: volumenSets(saved),
        muscle: trabajoMuscularWorkout(finished.workout, saved, []),
        records,
        nombres: Object.fromEntries(exercises.map(e => [e.id, e.nombre])),
        workoutId: workout.id,
      })
    } catch {
      setFinishError('No se ha podido terminar el entreno. Inténtalo de nuevo.')
      setConfirmando(true)
      setGuardando(false)
    }
  }

  const completadas = currentSets.filter(s => s.realizada === true || s.realizada === undefined && session.completed.includes(s.id)).map(s => s.id)
  useEffect(() => {
    if (!seriesCargadas) return
    setSession(prev => { const ids = currentSets.filter(s => s.realizada === true || s.realizada === undefined && prev.completed.includes(s.id)).map(s => s.id); return ids.join(',') === prev.completed.join(',') ? prev : { ...prev, completed: ids } })
  }, [seriesCargadas])
  const volumen = volumenSets(currentSets)
  const completedCount = completadas.length

  /** true si la serie queda marcada. */
  async function completar(s: SetEntry, numero: number): Promise<boolean> {
    if (confirmandoSeries.current.has(s.id)) return false
    confirmandoSeries.current.add(s.id)
    const nombre = exerciseMap.get(s.exerciseId)?.nombre ?? 'ejercicio'
    try {
      await pendingWrites.current.get(s.id!)
      const done = sessionActual.current.completed.includes(s.id!)
      const escritura = setsRepo.confirmar(s.id, !done)
      pendingWrites.current.set(s.id, escritura)
      try { await escritura } finally { if (pendingWrites.current.get(s.id) === escritura) pendingWrites.current.delete(s.id) }
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
      return !done
    } catch { avisarError('La serie no se ha guardado. Inténtalo de nuevo antes de completarla.'); return false } finally { confirmandoSeries.current.delete(s.id) }
  }

  const descansando = session.restEndsAt !== null
  return (
    <div ref={contenedorRef} className={`entreno-activo space-y-section px-page pb-16 pt-5 ${descansando ? 'descanso-activo' : ''}`}>
      {/* Cabecera fija: rutina, tiempo, volumen, series y Terminar siguen a la vista al bajar por los ejercicios. */}
      <section aria-label="Entreno en curso" className="training-surface workout-bar sticky top-0 z-20 space-y-2 px-3 py-2">
        <div className="flex min-h-touch items-center justify-between gap-2">
          <div className="min-w-0"><h1 className="break-words text-heading">{routine?.nombre ?? 'Entreno libre'}</h1><p className="training-muted text-caption">En curso · {formatHora(workout.inicio)}</p></div>
          <Button variant="ghost" className="training-secondary" size="sm" disabled={quitando} onClick={() => { setFinishError(null); setConfirmando(true) }}>
            Terminar
          </Button>
        </div>
        <div className="grid grid-cols-3 items-end gap-3">
          <div className="min-w-0"><p className="training-muted text-caption">Tiempo</p><p className="font-numeric text-title"><WorkoutClock start={workout.inicio} /></p></div>
          <div className="min-w-0"><p className="training-muted text-caption">Volumen</p><p className="tabular flex flex-wrap items-baseline gap-x-1"><span className="min-w-0 break-words font-numeric text-title">{formatInt(volumen)}</span><span className="training-muted text-caption">kg</span></p></div>
          <div className="min-w-0 text-right"><p className="training-muted text-caption">Series</p><p className="tabular flex items-baseline justify-end gap-x-1"><span className="font-numeric text-title">{completedCount}</span><span className="training-muted text-caption">/ {currentSets.length}</span></p></div>
        </div>
        <div className="training-progress"><ProgressBar value={completedCount} goal={currentSets.length} label="Series completadas" valueText={`${completedCount} de ${currentSets.length} series marcadas`} /></div>
      </section>

      {descansando && <div className="rest-dock pointer-events-none fixed inset-x-0 z-30">
        <div className="mx-auto max-w-lg px-page">
          <RestClock endsAt={session.restEndsAt!} duration={session.restTotal ?? session.restSeconds}
            onEnd={() => {
              setSession(previous => ({ ...previous, restEndsAt: null }))
              setFeedback('Descanso terminado. Listo para la siguiente serie.')
              haptic('success')
              if (ajustes?.sonidoDescanso !== false) pitar()
            }}
            onAjustar={delta => { setSession(previous => ajustarDescanso(previous, delta)); haptic('selection') }}
            onSkip={() => { setSession(previous => ({ ...previous, restEndsAt: null })); setFeedback('Descanso finalizado'); haptic() }} />
        </div>
      </div>}

      <section aria-label="Descanso entre series" className="space-y-2">
          <div ref={restConfig}><Disclosure title={`Descanso: ${session.restSeconds ? `${session.restSeconds} s` : 'sin temporizador'}`} open={restConfigOpen} onChange={setRestConfigOpen}>
            <div className="space-y-3">
              <SegmentedControl label="Duración del descanso" size="sm" valor={String(session.restSeconds)} onChange={value => {
                setSession(previous => ({ ...previous, restSeconds: Number(value), restEndsAt: null }))
                setRestConfigOpen(false)
                requestAnimationFrame(() => restConfig.current?.querySelector('button')?.focus({ preventScroll: true }))
              }} opciones={[{ valor: '0', label: 'No' }, { valor: '60', label: '60 s' }, { valor: '90', label: '90 s' }, { valor: '120', label: '120 s' }]} />
              <p className="text-caption text-fg-muted">Los ejercicios con descanso propio en la rutina usan ese tiempo. El aviso sonoro se ajusta en Ajustes y solo suena con la app abierta.</p>
            </div>
          </Disclosure></div>
      </section>
      <p role="status" className="sr-only">{feedback}</p>

      <div ref={listRef} className="space-y-stack">
        {visibleIds.map((exId, indice) => {
          const ex = exerciseMap.get(exId)
          if (!ex) return null
          const sets = currentSets.filter((s) => s.exerciseId === exId).sort((a, b) => a.orden - b.orden)
          const liga = ligas?.ligas.get(exId)
          return (
            <div key={exId}>
              <PanelEjercicio ejercicio={ex} sets={sets} barraKg={ajustes?.barraKg ?? 20}
                anteriores={anterioresPorSerie(sets, seriesSesionAnterior(allSets, exId, workout, todosWorkouts))}
                objetivo={routine?.objetivos?.[exId]} completadas={completadas} onCompletar={completar} preguntarRir={ajustes?.rirAlCompletar !== false} nuevaId={newSet} bloqueado={guardando || quitando}
                onActualizar={actualizarSet} onBorrar={borrarSet} onAgregar={() => agregarSet(exId)}
                onQuitar={() => quitarEjercicio(exId, ex.nombre)} onAviso={avisar}
                contexto={{ workoutId: workout.id, inicio: workout.inicio, nota: workout.notasEjercicios?.[exId], carga: workout.cargasEjercicios?.[exId], onCarga: carga => guardarCarga(exId, carga), workout, ejecucion: workout.ejecucionesEjercicios?.[exId], onEjecucion: async (c, habitual) => {
                  setGuardando(true); try { await Promise.all(pendingWrites.current.values()); const ids = new Set(await workoutsRepo.configurarEjecucion(workout.id, exId, c, habitual)); setSession(p => ({ ...p, completed: p.completed.filter(id => !ids.has(id)) })) } finally { setGuardando(false) }
                }, onProgresion: async (clave, decision) => { setGuardando(true); try { await Promise.all(pendingWrites.current.values()); await workoutsRepo.decidirProgresion(workout.id, exId, clave, decision) } finally { setGuardando(false) } } }}
                mover={visibleIds.length > 1 ? { puedeSubir: indice > 0, puedeBajar: indice < visibleIds.length - 1, onSubir: () => mover(indice, -1), onBajar: () => mover(indice, 1) } : undefined}
                liga={liga && ligas ? { estado: liga, avisar: avisarElite(liga, ex, ajustes?.ligaMantener), hoy, mantenido: !!ajustes?.ligaMantener?.includes(exId),
                  alternativas: liga.division.elite ? alternativas(ex, exercises, ligas.ligas) : [], sinRecords: ligas.sinRecords.get(exId) ?? 0,
                  rutinas: routine?.exerciseIds.includes(exId) ? [routine] : [] } : undefined} />
            </div>
          )
        })}
      </div>

      <p className="text-caption text-fg-muted">Introduce reps y kg y márcala con el botón de la derecha al terminar cada serie. El número de la serie cambia su tipo: calentamiento, dropset o negativas.</p>

      <Button data-add-exercise variant="secondary" size="lg" block disabled={guardando || quitando} onClick={() => setBuscandoEjercicio(true)}>
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
        ) : <Button variant="destructive" block disabled={guardando || quitando} onClick={() => { setFinishError(null); setDescartando(true) }}>Descartar entreno</Button>}
        {!confirmando && finishError && <ErrorState>{finishError}</ErrorState>}
      </section>

      <Sheet open={confirmando} onClose={() => setConfirmando(false)} title="Terminar entreno">
        <div className="space-y-4">
          {currentSets.length === 0
            ? <p className="text-body-sm text-fg-muted">No hay series registradas, así que no hay nada que guardar: al terminar se descartará este entreno.</p>
            : <p className="text-body-sm text-fg-muted">Se guardarán las {currentSets.length} series registradas. Solo las marcadas constarán como realizadas; las demás quedan pendientes y no se usan para recomendar progresión.</p>}
          {finishError && <ErrorState>{finishError}</ErrorState>}
          {currentSets.length === 0
            ? <Button block size="lg" variant="danger" loading={guardando} onClick={descartar}>Descartar entreno</Button>
            : <Button block size="lg" loading={guardando} onClick={terminar}>Guardar y terminar</Button>}
          <Button variant="ghost" block disabled={guardando} onClick={() => setConfirmando(false)}>Seguir entrenando</Button>
        </div>
      </Sheet>

      {buscandoEjercicio && <SelectorEjercicios onClose={() => setBuscandoEjercicio(false)} onElegir={elegirEjercicio} sugerencias={exercises.filter(e => { const base = currentSets.find(s => s.exerciseId === e.id && s.tipo !== 'calentamiento') ?? [...allSets].filter(s => s.exerciseId === e.id && convencional(s)).sort((a, b) => b.createdAt - a.createdAt)[0]; return base && tieneReps(base) && recomendarProgresion(e.id, base, e.progresion ?? routine?.objetivos?.[e.id], todosWorkouts, allSets, workout.inicio).propuesta }).map(e => e.id)} />}

      {toast}
    </div>
  )
}
