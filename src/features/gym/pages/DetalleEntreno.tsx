import { contextoSerie, describirReps } from '../lib/ejecucion'
import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import * as exercisesRepo from '../data/exercisesRepo'
import * as routinesRepo from '../data/routinesRepo'
import * as setsRepo from '../data/setsRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import { getSettings } from '../../../shared/db/settings'
import Button from '../../../shared/components/Button'
import ConfirmacionDestructiva from '../../../shared/components/ConfirmacionDestructiva'
import Icon from '../../../shared/components/Icon'
import { Input, Textarea } from '../../../shared/components/Input'
import Metric from '../../../shared/components/Metric'
import NumberStepper from '../../../shared/components/NumberStepper'
import PageHeader from '../../../shared/components/PageHeader'
import SectionHeader from '../../../shared/components/SectionHeader'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import { useAviso } from '../../../shared/hooks/useAviso'
import { formatFechaHoraConDia, toISODate } from '../../../shared/lib/dates'
import { formatNumber } from '../../../shared/lib/format'
import MapaMuscular from '../components/MapaMuscular'
import PanelEjercicio from '../components/PanelEjercicio'
import SelectorEjercicios from '../components/SelectorEjercicios'
import { ListaRecords } from '../components/WorkoutFinished'
import { trabajoMuscularWorkout } from '../lib/cargaMuscular'
import { recordsDeEntreno } from '../lib/records'
import type { SeleccionEjercicio } from '../lib/selectorEjercicios'
import { combinarFechaHora, efectivas, formatDuracion, formatHora, minutosEntre, moverElemento, ordenEjerciciosSesion, volumenSets } from '../lib/workout'
import { useQuitarEjercicio } from '../hooks/useQuitarEjercicio'
import { formatearCarga } from '../lib/carga'

interface Props {
  workoutId: number
  /** Abrir directamente en modo edición (entreno registrado a posteriori). */
  editarInicial?: boolean
  onVolver: () => void
}

/**
 * Detalle de un entreno terminado, con edición: horario, notas, series, ejercicios y orden. Es una vista dentro de la
 * pestaña (no un Sheet) para que el «Deshacer» de las series sea visible. Al añadir o quitar series se recalcula el
 * `muscleSnapshot` con la clasificación actual de los ejercicios.
 */
export default function DetalleEntreno({ workoutId, editarInicial = false, onVolver }: Props) {
  const [editando, setEditando] = useState(editarInicial)
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { avisar, avisarError, toast } = useAviso()

  const workout = useLiveQuery(async () => ({ id: workoutId, w: await workoutsRepo.obtener(workoutId) }), [workoutId])
  const sets = useLiveQuery(async () => ({ id: workoutId, s: await setsRepo.delWorkout(workoutId) }), [workoutId])
  const exercises = useLiveQuery(() => exercisesRepo.listar(), [])
  const todosWorkouts = useLiveQuery(() => workoutsRepo.listar(), [])
  const todasSeries = useLiveQuery(() => setsRepo.todas(), [])
  const ajustes = useLiveQuery(() => getSettings(), [])
  const w = workout?.id === workoutId ? workout.w : undefined
  const rutina = useLiveQuery(() => (w?.routineId ? routinesRepo.obtener(w.routineId) : undefined), [w?.routineId])
  const delEntreno = sets?.id === workoutId ? sets.s : undefined

  const [notas, setNotas] = useState('')
  const notasGuardadas = useRef('')
  useEffect(() => { setNotas(w?.notas ?? ''); notasGuardadas.current = w?.notas ?? '' }, [w?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const idsConSeries = Array.from(new Set([...(delEntreno ?? [])].sort((a, b) => a.createdAt - b.createdAt || a.id - b.id).map(s => s.exerciseId)))
  const ids = ordenEjerciciosSesion(editando ? rutina?.exerciseIds ?? [] : [], idsConSeries, w?.ordenEjercicios, w?.ejerciciosOmitidos)
  const { quitarEjercicio, quitando, contenedorRef } = useQuitarEjercicio({ workoutId, visibleIds: ids, bloqueado: ocupado, avisar, avisarError })

  async function guardarNotas() {
    if (notas === notasGuardadas.current) return
    try {
      await workoutsRepo.guardarNotas(workoutId, notas)
      notasGuardadas.current = notas
    } catch {
      avisarError('No se han podido guardar las notas. Inténtalo de nuevo.')
    }
  }

  if (workout === undefined || delEntreno === undefined || exercises === undefined || todosWorkouts === undefined || todasSeries === undefined) {
    return <div className="px-page pt-5"><LoadingState /></div>
  }
  if (!w || w.fin === undefined) {
    return <div className="space-y-3 px-page pt-5"><Button variant="ghost" size="sm" className="-ml-3" onClick={onVolver}><Icon name="arrow-left" size={18} />Historial</Button><EmptyState>Este entreno ya no está disponible.</EmptyState></div>
  }

  const fin = w.fin
  const exerciseMap = new Map(exercises.map((e) => [e.id, e]))
  const records = recordsDeEntreno(workoutId, todosWorkouts, todasSeries)
  const nombres = Object.fromEntries(exercises.map((e) => [e.id, e.nombre]))
  const minutos = minutosEntre(w.inicio, fin)

  async function accion(f: () => Promise<unknown>, fallo: string) {
    setError(null)
    try { await f() } catch (e) {
      const texto = e instanceof Error && (e.name === 'TiempoEntrenoInvalido' || e instanceof workoutsRepo.TiempoEntrenoInvalido) ? e.message : fallo
      setError(texto)
      avisarError(texto)
    }
  }

  const cambiarTiempos = (inicio: number | null, finNuevo: number) =>
    accion(async () => {
      if (inicio === null) throw new workoutsRepo.TiempoEntrenoInvalido('La fecha u hora no son válidas.')
      await workoutsRepo.actualizarTiempos(workoutId, inicio, finNuevo)
    }, 'No se ha podido guardar el horario. Inténtalo de nuevo.')

  function cambiarInicio(fecha: string, hora: string) {
    const inicio = combinarFechaHora(fecha, hora)
    if (inicio === null) return
    // Se conserva la duración al mover el inicio.
    void cambiarTiempos(inicio, inicio + (fin - w!.inicio))
  }

  async function actualizarSerie(id: number, cambio: setsRepo.CambioSerie) {
    try { await setsRepo.actualizar(id, cambio) } catch { const mensaje = 'No se ha podido guardar la serie. Inténtalo de nuevo.'; avisarError(mensaje); throw new Error(mensaje) }
  }

  async function agregarSerie(exerciseId: number) {
    await accion(async () => { await setsRepo.agregar(workoutId, exerciseId, w!.inicio); await workoutsRepo.recalcularSnapshot(workoutId) }, 'No se ha podido añadir la serie. Inténtalo de nuevo.')
  }

  async function borrarSerie(id: number, numero: number) {
    try {
      const set = await setsRepo.borrar(id)
      if (!set) return
      await workoutsRepo.recalcularSnapshot(workoutId)
      avisar({ mensaje: numero > 0 ? `Serie ${numero} borrada` : 'Serie de calentamiento borrada', onDeshacer: async () => { await setsRepo.restaurar([set]); await workoutsRepo.recalcularSnapshot(workoutId) } })
    } catch {
      avisarError('No se ha podido borrar la serie. Inténtalo de nuevo.')
    }
  }

  async function elegirEjercicio(value: SeleccionEjercicio) {
    await setsRepo.agregarSeleccion(workoutId, value, w!.inicio)
    await workoutsRepo.recalcularSnapshot(workoutId)
  }

  async function mover(indice: number, delta: -1 | 1) {
    await accion(() => workoutsRepo.guardarOrden(workoutId, moverElemento(ids, indice, delta)), 'No se ha podido cambiar el orden. Inténtalo de nuevo.')
  }

  async function borrarEntreno() {
    if (ocupado) return
    setOcupado(true)
    setError(null)
    try {
      await workoutsRepo.borrar(workoutId)
      onVolver()
    } catch {
      setConfirmandoBorrado(false)
      setError('No se ha podido borrar el entreno. Inténtalo de nuevo.')
      setOcupado(false)
    }
  }

  async function terminarEdicion() {
    await guardarNotas()
    setEditando(false)
  }

  return (
    <div ref={contenedorRef} className="space-y-section px-page pb-16 pt-5">
      <Button variant="ghost" size="sm" disabled={quitando} className="-ml-3" onClick={onVolver}><Icon name="arrow-left" size={18} />Historial</Button>
      <PageHeader title={formatFechaHoraConDia(w.inicio)} overline={editando ? 'Editando entreno' : undefined}
        action={editando
          ? <Button size="sm" disabled={quitando} onClick={terminarEdicion}>Listo</Button>
          : <Button variant="secondary" size="sm" onClick={() => setEditando(true)}><Icon name="pencil" size={16} />Editar</Button>} />

      <div className="grid grid-cols-3 gap-3 border-b border-line pb-4">
        <Metric size="title" label="Duración" valor={formatDuracion(fin - w.inicio)} />
        <Metric size="title" label="Series" valor={efectivas(delEntreno).length} />
        <Metric size="title" label="Volumen" valor={formatNumber(volumenSets(delEntreno), 1)} unidad="kg" />
      </div>
      {error && <ErrorState>{error}</ErrorState>}

      {editando && (
        <section aria-label="Horario del entreno" className="space-y-3">
          <SectionHeader>Horario</SectionHeader>
          <div className="grid grid-cols-2 gap-3">
            <label className="block min-w-0 space-y-1"><span className="text-label text-fg-muted">Fecha</span>
              <Input type="date" max={toISODate(new Date())} value={toISODate(new Date(w.inicio))} onChange={(e) => cambiarInicio(e.target.value, formatHora(w.inicio))} /></label>
            <label className="block min-w-0 space-y-1"><span className="text-label text-fg-muted">Hora de inicio</span>
              <Input type="time" value={formatHora(w.inicio)} onChange={(e) => cambiarInicio(toISODate(new Date(w.inicio)), e.target.value)} /></label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-body-sm text-fg-muted">Duración</span>
            <NumberStepper label="duración en minutos" suffix="min" min={1} step={5} value={minutos} onChange={(m) => { void cambiarTiempos(w.inicio, w.inicio + m * 60000) }} />
          </div>
        </section>
      )}

      {!editando && !!records.length && <ListaRecords records={records} nombres={nombres} />}
      {!editando && <MapaMuscular key={w.id} summary={trabajoMuscularWorkout(w, delEntreno, exercises)} />}

      <section aria-label="Notas del entreno" className="space-y-1">
        {editando ? (
          <label className="block space-y-1"><span className="text-label text-fg-muted">Notas del entreno</span>
            <Textarea rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} onBlur={() => { void guardarNotas() }} placeholder="Sensaciones, molestias, cambios…" /></label>
        ) : w.notas ? (
          <><SectionHeader>Notas</SectionHeader><p className="whitespace-pre-wrap break-words text-body-sm text-fg">{w.notas}</p></>
        ) : null}
      </section>

      {editando && <p className="text-caption text-fg-muted">Marca una serie con el botón de su derecha para confirmar que se realizó. Las series antiguas siguen sin confirmar hasta que lo indiques; cambiar reps, kg o técnica requiere confirmarlas de nuevo.</p>}
      {editando ? (
        <div className="space-y-stack">
          {ids.map((id, i) => {
            const ex = exerciseMap.get(id)
            if (!ex) return null
            return <PanelEjercicio key={id} ejercicio={ex} sets={delEntreno.filter((s) => s.exerciseId === id).sort((a, b) => a.orden - b.orden)} barraKg={ajustes?.barraKg ?? 20}
              objetivo={rutina?.objetivos?.[id]} onActualizar={actualizarSerie} onBorrar={borrarSerie} onAgregar={() => agregarSerie(id)}
              completadas={delEntreno.filter(s => s.realizada === true).map(s => s.id)} onCompletar={s => { void accion(() => setsRepo.confirmar(s.id, s.realizada !== true), 'No se ha podido confirmar la serie.') }}
              bloqueado={ocupado || quitando} onQuitar={() => quitarEjercicio(id, ex.nombre)} onAviso={avisar}
              contexto={{ workoutId, inicio: w.inicio, nota: w.notasEjercicios?.[id], carga: w.cargasEjercicios?.[id], onCarga: async carga => {
                setOcupado(true)
                try { await workoutsRepo.configurarCarga(workoutId, id, carga) }
                finally { setOcupado(false) }
              }, ejecucion: w.ejecucionesEjercicios?.[id], onEjecucion: async (c, habitual) => { setOcupado(true); try { await workoutsRepo.configurarEjecucion(workoutId, id, c, habitual) } finally { setOcupado(false) } } }}
              mover={ids.length > 1 ? { puedeSubir: i > 0, puedeBajar: i < ids.length - 1, onSubir: () => mover(i, -1), onBajar: () => mover(i, 1) } : undefined} />
          })}
          <Button data-add-exercise variant="secondary" size="lg" block disabled={ocupado || quitando} onClick={() => setBuscando(true)}><Icon name="plus" size={20} />Añadir ejercicio</Button>
        </div>
      ) : (
        <div className="space-y-section">
          {ids.map((id) => {
            const series = delEntreno.filter((s) => s.exerciseId === id).sort((a, b) => a.orden - b.orden)
            let n = 0
            return (
              <section key={id} aria-label={exerciseMap.get(id)?.nombre ?? 'Ejercicio'} className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="min-w-0 break-words text-title text-fg">{exerciseMap.get(id)?.nombre ?? '…'}</h2>
                  <span className="tabular text-caption text-fg-muted">{formatNumber(volumenSets(series), 1)} kg</span>
                </div>
                <table className="tabular w-full table-fixed break-words text-body-sm">
                  <thead>
                    <tr className="text-left text-label text-fg-muted">
                      <th className="w-16 pb-1 font-semibold">Serie</th>
                      <th className="pb-1 text-right font-semibold">Reps</th>
                      <th className="pb-1 text-right font-semibold">Carga</th>
                      <th className="w-16 pb-1 text-right font-semibold">RIR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {series.map((s) => (
                      <tr key={s.id}>
                        <td className="py-1.5 text-fg-muted">{s.tipo === 'calentamiento' ? 'C' : ++n}<span className="block text-caption">{s.realizada === true ? 'Realizada' : s.realizada === false ? 'Pendiente' : 'Sin confirmar'}</span></td>
                        <td className="py-1.5 text-right text-fg">{describirReps(s)}</td>
                        <td className="py-1.5 text-right font-semibold text-fg">{s.ejecucion === 'lados' ? 'Por lado' : formatearCarga(s)}</td>
                        <td className="py-1.5 text-right text-fg-muted">{s.rir ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {series.filter(s => contextoSerie(s)).map(s => <div key={s.id} className="space-y-1 text-caption text-fg-muted"><p>{contextoSerie(s)}</p>{s.ejecucion === 'lados' && <p>{Object.entries(s.lados ?? {}).map(([l, p]) => `${l}: RIR ${p.rir ?? '—'}`).join(' · ')}</p>}{s.bajadas?.map((b, i) => <p key={b.id}>Bajada {i + 1}: {describirReps({ ...s, ...b })}{s.ejecucion !== 'lados' ? ` · ${formatearCarga({ ...s, ...b })}` : ''}</p>)}</div>)}
                {w.notasEjercicios?.[id] && <p className="whitespace-pre-wrap break-words text-body-sm text-fg-muted">{w.notasEjercicios[id]}</p>}
                {series.some((s) => s.tipo === 'calentamiento') && <p className="text-caption text-fg-muted">C = calentamiento (no cuenta en volumen).</p>}
              </section>
            )
          })}
          {ids.length === 0 && <EmptyState>Sin ejercicios registrados.</EmptyState>}
        </div>
      )}

      <section aria-label="Borrar entreno" className="space-y-2 border-t border-line pt-3">
        {confirmandoBorrado ? (
          <ConfirmacionDestructiva mensaje="¿Borrar este entreno y todas sus series? No se puede deshacer." confirmar="Sí, borrar"
            onConfirmar={borrarEntreno} onCancelar={() => setConfirmandoBorrado(false)} ocupado={ocupado} />
        ) : <Button variant="destructive" block disabled={ocupado || quitando} onClick={() => { setError(null); setConfirmandoBorrado(true) }}>Borrar entreno</Button>}
      </section>

      {buscando && <SelectorEjercicios onClose={() => setBuscando(false)} onElegir={elegirEjercicio} />}
      {toast}
    </div>
  )
}
