import { recomendarProgresion } from '../lib/progresion'
import { convencional, tieneReps, cambiaRealizacion } from '../lib/ejecucion'
import { anterioresPorSerie, seriesSesionAnterior } from '../lib/anterior'
import { gimnasioDeSerie, notaPrimeraVez, primeraVez } from '../lib/gimnasios'
import { useNombresGimnasio } from '../hooks/useNombresGimnasio'
import { ChipGimnasio } from '../components/GimnasioSheet'
import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import * as exercisesRepo from '../data/exercisesRepo'
import * as routinesRepo from '../data/routinesRepo'
import * as setsRepo from '../data/setsRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import type { ConfiguracionCarga, SetEntry, Workout } from '../../../shared/db/types'
import { getSettings, updateSettings } from '../../../shared/db/settings'
import { pitar } from '../../../shared/lib/sonido'
import ConfirmacionDestructiva from '../../../shared/components/ConfirmacionDestructiva'
import PanelEjercicio from '../components/PanelEjercicio'
import { Textarea } from '../../../shared/components/Input'
import { recordsDeEntreno } from '../lib/records'
import SelectorEjercicios from '../components/SelectorEjercicios'
import type { SeleccionEjercicio } from '../lib/selectorEjercicios'
import { trabajoMuscularWorkout } from '../lib/cargaMuscular'
import { efectivas, formatHora, moverElemento, ordenEjerciciosSesion, seriesSinMarcar, volumenSets } from '../lib/workout'
import { formatInt } from '../../../shared/lib/format'
import Sheet from '../../../shared/components/Sheet'
import Button, { IconButton } from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import { useAviso } from '../../../shared/hooks/useAviso'
import { useListMotion } from '../../../shared/hooks/useListMotion'
import { haptic, reduceMotion } from '../../../shared/design/motion'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import ProgresoSeries from '../components/ProgresoSeries'
import { ajustarDescanso, clearSession, descansoParaEjercicio, guardarDescansoHabitual, readSession, seriesMarcadas, siguienteEjercicioPendiente, writeSession } from '../lib/session'
import { RestClock, WorkoutClock } from '../components/WorkoutClock'
import type { WorkoutSummary } from '../components/WorkoutFinished'
import { ErrorState } from '../../../shared/components/StateMessage'
import Disclosure from '../../../shared/components/Disclosure'
import { useQuitarEjercicio } from '../hooks/useQuitarEjercicio'
import { todayISO } from '../../../shared/lib/dates'
import { useLigasSesion } from '../../liga/hooks/useLigasSesion'
import { avisarElite } from '../../liga/lib/basicos'
import { alternativas } from '../../liga/lib/alternativas'
import Pista from '../../../shared/components/Pista'
import { useGuardadoLocal } from '../hooks/useGuardadoLocal'
import DescansoSugerido from '../components/DescansoSugerido'
import { CATALOGO_POR_ID } from '../lib/catalogoEjercicios'
import { descansoSugerido, PISTA_DESCANSO, proponerDescanso, textoDescanso } from '../lib/descansoSugerido'

/** Con el teclado abierto (un campo con foco) la pantalla no se mueve sola. */
const escribiendo = () => !!document.activeElement?.matches('input, textarea, select, [contenteditable="true"]')

interface Props {
  workout: Workout
  onFinished: (summary: WorkoutSummary) => void
  /** Deja el entreno en segundo plano (la barra del entreno en curso, sobre la navegación, lo vuelve a abrir). */
  onMinimizar: () => void
}

export default function EntrenoActivo({ workout, onFinished, onMinimizar }: Props) {
  const [buscandoEjercicio, setBuscandoEjercicio] = useState(false)
  const [session, setSession] = useState(() => readSession(workout.id!))
  const sessionActual = useRef(session)
  sessionActual.current = session
  const [confirmando, setConfirmando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  /** Al terminar: si se ha elegido «Marcar todas y terminar» (para el spinner del botón pulsado). */
  const [marcandoTodas, setMarcandoTodas] = useState(false)
  const [newSet, setNewSet] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  const [finishError, setFinishError] = useState<string | null>(null)
  const [restConfigOpen, setRestConfigOpen] = useState(false)
  const [descartando, setDescartando] = useState(false)
  const [notas, setNotas] = useState(workout.notas ?? '')
  /** Propuesta de descanso bajo el ejercicio de la primera serie marcada sin temporizador (ENT-14). */
  const [sugerencia, setSugerencia] = useState<{ exId: number; segundos: number } | null>(null)
  /** Ejercicios con todas sus series hechas que se han desplegado a mano: los demás completos se pliegan (E3, ADR 035). */
  const [desplegados, setDesplegados] = useState<ReadonlySet<number>>(() => new Set())
  const notasGuardadas = useRef(workout.notas ?? '')
  const temporizadorNotas = useRef<ReturnType<typeof setTimeout> | null>(null)
  const restConfig = useRef<HTMLDivElement>(null)
  const cabecera = useRef<HTMLElement>(null)
  /** Al completar un ejercicio, el siguiente pendiente al que bajar (`n` repite el salto aunque sea el mismo). */
  const [irA, setIrA] = useState<{ exId: number; n: number } | null>(null)
  const confirmandoSeries = useRef(new Set<number>())
  const { guardado, pendientes, errores } = useGuardadoLocal()
  const pendingWrites = useRef(new Map<number, Promise<void>>())
  const { avisar, avisarError, toast } = useAviso()

  const seriesCargadas = useLiveQuery(() => setsRepo.delWorkout(workout.id!), [workout.id])
  const currentSets = seriesCargadas ?? []
  const allSets = useLiveQuery(() => setsRepo.todas(), []) ?? []
  const exercises = useLiveQuery(() => exercisesRepo.listar(), []) ?? []
  const ajustes = useLiveQuery(() => getSettings(), [])
  const todosWorkouts = useLiveQuery(() => workoutsRepo.listar(), []) ?? []
  const nombreGimnasio = useNombresGimnasio()
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
      for (const id of ids) guardado.olvidar(`serie-${id}`)
      guardado.olvidar(`agregar-${captura.exerciseId}`)
      const completadas = sessionActual.current.completed.filter(id => ids.has(id))
      setSession(previous => ({ ...previous, completed: previous.completed.filter(id => !ids.has(id)) }))
      return () => setSession(previous => ({ ...previous, completed: [...new Set([...previous.completed, ...completadas])] }))
    },
  })

  async function guardarNotas() {
    if (temporizadorNotas.current !== null) { clearTimeout(temporizadorNotas.current); temporizadorNotas.current = null }
    if (notas === notasGuardadas.current) return true
    try {
      await guardado.guardar('notas', async () => { await workoutsRepo.guardarNotas(workout.id!, notas); notasGuardadas.current = notas })
      return true
    } catch {
      avisarError('No se han podido guardar las notas. Inténtalo de nuevo.')
      return false
    }
  }

  /** Las series realizadas conservan sus cifras; las pendientes de máquinas se vuelven a precargar (ADR 054). */
  async function cambiarGimnasio(gimnasioId: number | undefined) {
    setGuardando(true)
    try {
      await Promise.all(pendingWrites.current.values())
      const cambiadas = await workoutsRepo.cambiarGimnasio(workout.id, gimnasioId)
      setFeedback(cambiadas.length ? `Gimnasio cambiado. ${cambiadas.length === 1 ? 'Se ha actualizado 1 serie pendiente' : `Se han actualizado ${cambiadas.length} series pendientes`}.` : 'Gimnasio cambiado.')
    } finally { setGuardando(false) }
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
    temporizadorNotas.current = t
    return () => { clearTimeout(t); if (temporizadorNotas.current === t) temporizadorNotas.current = null }
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
      await guardado.guardar(`agregar-${exerciseId}`, async () => { setNewSet(await setsRepo.agregar(workout.id!, exerciseId)) })
      haptic()
    } catch {
      avisarError('No se ha podido añadir la serie. Inténtalo de nuevo.')
    }
  }

  async function actualizarSet(id: number, cambio: setsRepo.CambioSerie) {
    // Cambiar el tipo o el RIR no desmarca la serie; reps y peso sí.
    if (currentSets.some(s => s.id === id && cambiaRealizacion(s, typeof cambio === 'function' ? cambio(s) : cambio))) setSession(previous => ({ ...previous, completed: previous.completed.filter(n => n !== id) }))
    const operation = guardado.guardar(`serie-${id}`, () => setsRepo.actualizar(id, cambio))
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
      await pendingWrites.current.get(id)
      const set = await setsRepo.borrar(id)
      guardado.olvidar(`serie-${id}`)
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

  async function terminar(marcarTodas = false) {
    if (guardando) return
    setGuardando(true)
    setMarcandoTodas(marcarTodas)
    try {
      await Promise.all(pendingWrites.current.values())
      if (!await guardarNotas()) throw new Error('No se han podido guardar las notas.')
      await guardado.esperar()
      const finished = await workoutsRepo.terminar(workout.id!, sessionActual.current.completed, marcarTodas)
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
        catalogIds: Object.fromEntries(exercises.map(e => [e.id, e.catalogId])),
        workoutId: workout.id,
      })
    } catch {
      setFinishError('No se ha podido terminar el entreno. Inténtalo de nuevo.')
      setConfirmando(true)
      setGuardando(false)
    }
  }

  const completadas = seriesMarcadas(currentSets, session.completed)
  useEffect(() => {
    if (!seriesCargadas) return
    setSession(prev => { const ids = seriesMarcadas(currentSets, prev.completed); return ids.join(',') === prev.completed.join(',') ? prev : { ...prev, completed: ids } })
  }, [seriesCargadas])
  // Tras el plegado del ejercicio completado: el siguiente queda justo bajo la cabecera fija (ENT-15).
  useEffect(() => {
    if (!irA) return
    const marco = requestAnimationFrame(() => {
      const destino = contenedorRef.current?.querySelector<HTMLElement>(`[data-ejercicio="${irA.exId}"]`)
      if (!destino || escribiendo()) return
      const barra = cabecera.current
      const fija = barra && getComputedStyle(barra).position === 'sticky'
      destino.style.scrollMarginTop = fija ? `calc(${barra.getBoundingClientRect().height}px + var(--space-stack))` : ''
      destino.scrollIntoView({ block: 'start', behavior: reduceMotion() ? 'instant' : 'smooth' })
    })
    return () => cancelAnimationFrame(marco)
  }, [irA, contenedorRef])
  const volumen = volumenSets(currentSets)
  const completedCount = completadas.length
  const sinMarcar = seriesSinMarcar(currentSets, completadas)

  /** true si la serie queda marcada. */
  async function completar(s: SetEntry, numero: number): Promise<boolean> {
    if (confirmandoSeries.current.has(s.id)) return false
    confirmandoSeries.current.add(s.id)
    const nombre = exerciseMap.get(s.exerciseId)?.nombre ?? 'ejercicio'
    try {
      await pendingWrites.current.get(s.id!)
      const done = sessionActual.current.completed.includes(s.id!)
      const escritura = guardado.guardar(`serie-${s.id}`, () => setsRepo.confirmar(s.id, !done))
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
      // La propuesta de descanso sale bajo este ejercicio: si se propone, no se baja al siguiente para que se vea.
      const proponer = !done && !sugerencia && proponerDescanso(sessionActual.current.restSeconds, routine?.objetivos?.[s.exerciseId]?.descansoSeg, ajustes?.pistasVistas)
      if (proponer) setSugerencia({ exId: s.exerciseId, segundos: descansoSugerido(exerciseMap.get(s.exerciseId)?.catalogId) })
      if (!done && !proponer && !escribiendo()) {
        const marcadas = [...seriesMarcadas(currentSets, sessionActual.current.completed), s.id!]
        const suyas = currentSets.filter(x => x.exerciseId === s.exerciseId)
        const siguiente = suyas.every(x => marcadas.includes(x.id)) ? siguienteEjercicioPendiente(visibleIds, currentSets, marcadas, s.exerciseId) : null
        if (siguiente !== null) setIrA(previo => ({ exId: siguiente, n: (previo?.n ?? 0) + 1 }))
      }
      const que = numero > 0 ? `Serie ${numero}` : 'Calentamiento'
      setFeedback(done ? `${que} de ${nombre} pendiente` : `${que} de ${nombre} completada`)
      return !done
    } catch { avisarError('La serie no se ha guardado. Inténtalo de nuevo antes de completarla.'); return false } finally { confirmandoSeries.current.delete(s.id) }
  }

  /** «Sí» fija el descanso de la sesión (y de las siguientes) y lo empieza a contar ya, tras la serie recién marcada; las dos respuestas cierran la propuesta para siempre. */
  function responderDescanso(si: boolean) {
    if (!sugerencia) return
    const segundos = sugerencia.segundos
    if (si) {
      setSession(previous => ({ ...previous, restSeconds: segundos, restEndsAt: Date.now() + segundos * 1000, restTotal: segundos }))
      guardarDescansoHabitual(segundos)
      setFeedback(`Descanso de ${textoDescanso(segundos)} entre series`)
    }
    setSugerencia(null)
    // Un fallo al guardar solo hace que la propuesta vuelva a salir en otro entreno: no merece un error.
    updateSettings({ pistasVistas: [...new Set([...(ajustes?.pistasVistas ?? []), PISTA_DESCANSO])].sort() }).catch(() => undefined)
  }

  const descansando = session.restEndsAt !== null
  return (
    <div ref={contenedorRef} className={`entreno-activo space-y-section px-page pb-16 pt-5 ${descansando ? 'descanso-activo' : ''}`}>
      {/* Cabecera fija: rutina, tiempo, volumen, series y Terminar siguen a la vista al bajar por los ejercicios. */}
      <section ref={cabecera} aria-label="Entreno en curso" className="training-surface workout-bar sticky top-0 z-20 space-y-2 px-3 py-2">
        <div className="flex min-h-touch items-center justify-between gap-2">
          <IconButton icon="chevron-down" label="Minimizar entreno" variant="ghost" className="-ml-2" onClick={onMinimizar} />
          <div className="min-w-0 flex-1"><h1 className="break-words text-heading">{routine?.nombre ?? 'Entreno libre'}</h1><p className="training-muted text-caption">Desde las {formatHora(workout.inicio)}</p></div>
          <Button variant="ghost" className="training-secondary" size="sm" disabled={quitando} onClick={() => { setFinishError(null); setConfirmando(true) }}>
            Terminar
          </Button>
        </div>
        {/* El tiempo manda (es lo que se mira entre series); volumen y series, a su lado (E2, ADR 035). */}
        <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
          <p className="min-w-0"><span className="sr-only">Tiempo: </span><span className="font-numeric text-display leading-none"><WorkoutClock start={workout.inicio} /></span></p>
          <div className="min-w-0 text-right">
            <p className="tabular flex flex-wrap items-baseline justify-end gap-x-1"><span className="min-w-0 break-words font-numeric text-title">{formatInt(volumen)}</span><span className="training-muted text-caption">kg</span></p>
            <p className="tabular flex items-baseline justify-end gap-x-1"><span className="font-numeric text-title">{completedCount}</span><span className="training-muted text-caption">/ {currentSets.length} series</span></p>
          </div>
        </div>
        <ProgresoSeries hechas={completedCount} total={currentSets.length} />
      </section>

      {descansando && <div className="rest-dock safe-inline pointer-events-none fixed inset-x-0 z-30">
        <div className="app-content mx-auto px-page">
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

      <section aria-label="Gimnasio" className="flex flex-wrap items-center gap-2">
        <ChipGimnasio gimnasioId={workout.gimnasioId} disabled={guardando || quitando} onElegir={cambiarGimnasio} />
      </section>
      <section aria-label="Descanso entre series" className="space-y-2">
          <div ref={restConfig}><Disclosure title={`Descanso: ${session.restSeconds ? `${session.restSeconds} s` : 'sin temporizador'}`} open={restConfigOpen} onChange={setRestConfigOpen}>
            <div className="space-y-3">
              <SegmentedControl label="Duración del descanso" size="sm" valor={String(session.restSeconds)} onChange={value => {
                setSession(previous => ({ ...previous, restSeconds: Number(value), restEndsAt: null }))
                guardarDescansoHabitual(Number(value))
                setRestConfigOpen(false)
                requestAnimationFrame(() => restConfig.current?.querySelector('button')?.focus({ preventScroll: true }))
              }} opciones={[{ valor: '0', label: 'No' }, { valor: '60', label: '60 s' }, { valor: '90', label: '90 s' }, { valor: '120', label: '120 s' }]} />
              <p className="text-caption text-fg-muted">Los ejercicios con descanso propio en la rutina usan ese tiempo.</p>
            </div>
          </Disclosure></div>
      </section>
      <p role="status" className="sr-only">{feedback}</p>

      <section aria-label="Guardado local" className="space-y-1">
        <p role="status" className={`text-caption ${errores ? 'text-destructive' : 'text-fg-muted'}`}>
          {errores ? 'Hay cambios que no se han podido guardar en este dispositivo.' : guardando || pendientes || notas !== notasGuardadas.current ? 'Guardando en este dispositivo…' : 'Guardado en este dispositivo'}
        </p>
        {errores > 0 && <Button variant="secondary" size="sm" disabled={pendientes > 0} onClick={() => { void guardado.reintentar() }}>Reintentar guardado</Button>}
      </section>
      <Pista id="entreno-series" />

      <div ref={listRef} className="space-y-stack">
        {visibleIds.map((exId, indice) => {
          const ex = exerciseMap.get(exId)
          if (!ex) return null
          const sets = currentSets.filter((s) => s.exerciseId === exId).sort((a, b) => a.orden - b.orden)
          const liga = ligas?.ligas.get(exId)
          const completo = sets.length > 0 && sets.every((s) => completadas.includes(s.id))
          const nuevaMaquina = primeraVez(allSets, ex, workout)
          return (
            <div key={exId} data-ejercicio={exId}>
              <PanelEjercicio ejercicio={ex} sets={sets} barraKg={ajustes?.barraKg ?? 20}
                notaGimnasio={nuevaMaquina && notaPrimeraVez(nombreGimnasio(workout.gimnasioId), nuevaMaquina.habitual)}
                anteriores={anterioresPorSerie(sets, seriesSesionAnterior(allSets, exId, workout, todosWorkouts, gimnasioDeSerie(workout.gimnasioId, ex)))}
                referenciasCarga={seriesSesionAnterior(allSets, exId, workout, todosWorkouts, gimnasioDeSerie(workout.gimnasioId, ex))}
                objetivo={routine?.objetivos?.[exId]} completadas={completadas} onCompletar={completar} preguntarRir={ajustes?.rirAlCompletar !== false} nuevaId={newSet} bloqueado={guardando || quitando}
                onActualizar={actualizarSet} onBorrar={borrarSet} onAgregar={() => agregarSet(exId)}
                onQuitar={() => quitarEjercicio(exId, ex.nombre)} onAviso={avisar}
                contexto={{ workoutId: workout.id, inicio: workout.inicio, nota: workout.notasEjercicios?.[exId], carga: workout.cargasEjercicios?.[exId], onCarga: carga => guardarCarga(exId, carga), workout, ejecucion: workout.ejecucionesEjercicios?.[exId], onEjecucion: async (c, habitual) => {
                  setGuardando(true); try { await Promise.all(pendingWrites.current.values()); const ids = new Set(await workoutsRepo.configurarEjecucion(workout.id, exId, c, habitual)); setSession(p => ({ ...p, completed: p.completed.filter(id => !ids.has(id)) })) } finally { setGuardando(false) }
                }, onProgresion: async (clave, decision) => { setGuardando(true); try { await Promise.all(pendingWrites.current.values()); await workoutsRepo.decidirProgresion(workout.id, exId, clave, decision) } finally { setGuardando(false) } } }}
                mover={visibleIds.length > 1 ? { puedeSubir: indice > 0, puedeBajar: indice < visibleIds.length - 1, onSubir: () => mover(indice, -1), onBajar: () => mover(indice, 1) } : undefined}
                liga={liga && ligas ? { estado: liga, avisar: avisarElite(liga, ex, ajustes?.ligaMantener), hoy, mantenido: !!ajustes?.ligaMantener?.includes(exId),
                  alternativas: liga.division.elite ? alternativas(ex, exercises, ligas.ligas) : [], sinRecords: ligas.sinRecords.get(exId) ?? 0,
                  rutinas: routine?.exerciseIds.includes(exId) ? [routine] : [] } : undefined}
                plegado={completo && !desplegados.has(exId)}
                onPlegar={(plegar) => setDesplegados((previo) => { const s = new Set(previo); if (plegar) s.delete(exId); else s.add(exId); return s })} />
              {sugerencia?.exId === exId && session.restSeconds === 0 && <DescansoSugerido segundos={sugerencia.segundos} ejercicio={ex.nombre}
                compuesto={CATALOGO_POR_ID.get(ex.catalogId ?? '')?.tipo === 'compuesto'} onSi={() => responderDescanso(true)} onNo={() => responderDescanso(false)} />}
            </div>
          )
        })}
      </div>

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
            : sinMarcar.confirmables.length > 0
              // Sin el tic, el entreno se guardaría sin volumen: se avisa y marcar todas es la salida principal.
              ? <div className="space-y-2">
                  <p className="flex items-start gap-2 text-body font-semibold text-warning"><Icon name="alert" size={20} className="mt-0.5" />
                    <span className="min-w-0">{completedCount === 0 ? 'No has marcado ninguna serie como hecha.' : `Te faltan ${currentSets.length - completedCount} de ${currentSets.length} series por marcar.`}</span></p>
                  <p className="text-body-sm text-fg-muted">Las series sin marcar se guardan como pendientes: no suman volumen ni cuentan para récords ni progreso.{sinMarcar.sinReps > 0 && ' Las que no tienen repeticiones se quedan pendientes igualmente.'}</p>
                </div>
              : <p className="text-body-sm text-fg-muted">Se guardarán las {currentSets.length} series registradas. Solo las marcadas constarán como realizadas; las demás quedan pendientes y no se usan para recomendar progresión.</p>}
          {finishError && <ErrorState>{finishError}</ErrorState>}
          {currentSets.length === 0
            ? <Button block size="lg" variant="danger" loading={guardando} onClick={descartar}>Descartar entreno</Button>
            : sinMarcar.confirmables.length > 0
              ? <>
                  <Button block size="lg" loading={guardando && marcandoTodas} disabled={guardando} onClick={() => terminar(true)}>Marcar todas y terminar</Button>
                  <Button variant="secondary" block loading={guardando && !marcandoTodas} disabled={guardando} onClick={() => terminar()}>{completedCount === 0 ? 'Guardar sin marcar' : 'Guardar solo las marcadas'}</Button>
                </>
              : <Button block size="lg" loading={guardando} onClick={() => terminar()}>Guardar y terminar</Button>}
          <Button variant="ghost" block disabled={guardando} onClick={() => setConfirmando(false)}>Seguir entrenando</Button>
        </div>
      </Sheet>

      {buscandoEjercicio && <SelectorEjercicios onClose={() => setBuscandoEjercicio(false)} onElegir={elegirEjercicio} sugerencias={exercises.filter(e => { const base = currentSets.find(s => s.exerciseId === e.id && s.tipo !== 'calentamiento') ?? [...allSets].filter(s => s.exerciseId === e.id && convencional(s)).sort((a, b) => b.createdAt - a.createdAt)[0]; return base && tieneReps(base) && recomendarProgresion(e.id, base, e.progresion ?? routine?.objetivos?.[e.id], todosWorkouts, allSets, workout.inicio).propuesta }).map(e => e.id)} />}

      {toast}
    </div>
  )
}
