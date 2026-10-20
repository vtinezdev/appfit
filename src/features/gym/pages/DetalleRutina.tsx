import { lazy, Suspense, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import * as exercisesRepo from '../data/exercisesRepo'
import * as routinesRepo from '../data/routinesRepo'
import * as setsRepo from '../data/setsRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import Badge from '../../../shared/components/Badge'
import Button from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import ConfirmacionDestructiva from '../../../shared/components/ConfirmacionDestructiva'
import Icon from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import ListRow from '../../../shared/components/ListRow'
import SectionHeader from '../../../shared/components/SectionHeader'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import { formatFechaHoraConDia } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import EditorRutina from '../components/EditorRutina'
import MiniaturaEjercicio from '../components/MiniaturaEjercicio'
import { cuandoRutina, EtiquetasMusculos } from '../components/TarjetaRutina'
import { useFiguraMapa } from '../hooks/useFiguraMapa'
import { textoAgarre } from '../lib/agarres'
import { musculosRutina, sesionesRutina, ultimaVezEjercicios } from '../lib/fichaRutina'
import { textoCalentamientos, textoObjetivo } from '../lib/objetivos'
import { resumenRutina } from '../lib/rutinas'
import { formatDuracion } from '../lib/workout'

// Diferido: la geometría de los muñecos no entra en el arranque.
const MiniMapa = lazy(() => import('../components/MapaMuscular').then(m => ({ default: m.MiniMapa })))

interface Props {
  routineId: number
  /** Hay un entreno en curso: no se ofrece empezar otro. */
  enCurso: boolean
  onVolver: () => void
  /** Se ha empezado el entreno de la rutina: abre la sesión. */
  onEmpezado: () => void
  /** Abre la ficha de un entreno hecho con la rutina. */
  onAbrirEntreno: (id: number) => void
}

/**
 * Ficha de una rutina guardada: cabecera de grafito con el mapa de lo que trabaja, cifras y «Empezar»; sus músculos,
 * sus ejercicios con el objetivo y la última serie hecha, y sus últimas sesiones. «Editar» abre la hoja de edición.
 */
export default function DetalleRutina({ routineId, enCurso, onVolver, onEmpezado, onAbrirEntreno }: Props) {
  const [editando, setEditando] = useState(0)
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [empezando, setEmpezando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const figura = useFiguraMapa()
  const rutina = useLiveQuery(async () => ({ id: routineId, r: await routinesRepo.obtener(routineId) }), [routineId])
  const exercises = useLiveQuery(() => exercisesRepo.listar(), [])
  const workouts = useLiveQuery(() => workoutsRepo.listar(), [])
  const sets = useLiveQuery(() => setsRepo.todas(), [])
  const volver = <Button variant="ghost" size="sm" className="-ml-3" onClick={onVolver}><Icon name="arrow-left" size={18} />Rutinas</Button>

  if (rutina?.id !== routineId || exercises === undefined || workouts === undefined || sets === undefined) return <div className="px-page pt-5"><LoadingState /></div>
  const r = rutina.r
  if (!r) return <div className="space-y-3 px-page pt-5">{volver}<EmptyState>Esta rutina ya no está disponible.</EmptyState></div>

  const exerciseMap = new Map(exercises.map((e) => [e.id, e]))
  const ids = r.exerciseIds.filter((id) => exerciseMap.has(id))
  const resumen = resumenRutina(r, workouts, exerciseMap)
  const musculos = musculosRutina(r, exercises)
  const sesiones = sesionesRutina(r.id, workouts, sets)
  const ultimas = ultimaVezEjercicios(ids, workouts, sets)

  async function empezar() {
    if (empezando) return
    setEmpezando(true)
    setError(null)
    try { await workoutsRepo.empezar(routineId); onEmpezado() } catch { setError('No se ha podido empezar el entreno. Inténtalo de nuevo.'); setEmpezando(false) }
  }

  async function borrar() {
    if (ocupado) return
    setOcupado(true)
    setError(null)
    try {
      await routinesRepo.borrar(routineId)
      onVolver()
    } catch {
      setConfirmandoBorrado(false)
      setError('No se ha podido borrar la rutina. Inténtalo de nuevo.')
      setOcupado(false)
    }
  }

  return (
    <div className="space-y-section px-page pb-16 pt-5">
      <div className="flex items-center justify-between gap-2">
        {volver}
        <Button variant="secondary" size="sm" onClick={() => setEditando((n) => n + 1)}><Icon name="pencil" size={16} />Editar</Button>
      </div>

      <section aria-label={r.nombre} className="training-surface session-poster space-y-5 p-5">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1 basis-32 space-y-1">
            <p className="training-muted text-rotulo">{cuandoRutina(resumen.ultima)}</p>
            <h1 className="poster-title">{r.nombre}</h1>
          </div>
          {musculos.principales.length > 0 && <span className="rutina-mapa"><Suspense fallback={<span className="muscle-mini" />}><MiniMapa levels={musculos.levels} figura={figura} /></Suspense></span>}
        </div>
        <dl className={`cifras-filetes grid ${resumen.series === null ? 'grid-cols-2' : 'grid-cols-3'}`}>
          <div className="min-w-0"><dt className="training-muted text-caption">Ejercicios</dt><dd className="font-numeric text-heading tabular">{formatInt(ids.length)}</dd></div>
          {resumen.series !== null && <div className="min-w-0"><dt className="training-muted text-caption">Series</dt><dd className="font-numeric text-heading tabular">{formatInt(resumen.series)}</dd></div>}
          <div className="min-w-0"><dt className="training-muted text-caption">Hecha</dt><dd className="tabular"><span className="font-numeric text-heading">{formatInt(sesiones.total)}</span> <span className="training-muted text-caption">{sesiones.total === 1 ? 'vez' : 'veces'}</span></dd></div>
        </dl>
        {!enCurso && <Button variant="ghost" size="lg" block className="training-primary" loading={empezando} onClick={empezar}>
          <Icon name="play" size={20} />Empezar {r.nombre}
        </Button>}
        {enCurso && <p className="training-muted text-body-sm">Tienes un entreno en curso: termínalo para empezar esta rutina.</p>}
      </section>
      {error && <ErrorState>{error}</ErrorState>}

      {musculos.principales.length > 0 && <section aria-label="Músculos" className="space-y-stack">
        <SectionHeader variant="section">Músculos</SectionHeader>
        <EtiquetasMusculos musculos={musculos.principales} />
      </section>}

      <section aria-label="Ejercicios" className="space-y-stack">
        <SectionHeader variant="section">Ejercicios</SectionHeader>
        {ids.length > 0 ? <ol className="space-y-2">
          {ids.map((id, i) => {
            const ex = exerciseMap.get(id)!
            const objetivo = r.objetivos?.[id]
            const calentamientos = objetivo && textoCalentamientos(objetivo)
            const agarre = textoAgarre(r.agarres?.[id])
            return <li key={id}>
              <Card padded={false} className="flex flex-wrap items-start gap-3 px-4 py-3">
                <span className="relative shrink-0">
                  <MiniaturaEjercicio catalogId={ex.catalogId} />
                  <span aria-hidden className="tabular absolute -left-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-pill bg-fg text-caption font-bold text-bg">{i + 1}</span>
                </span>
                <span className="min-w-0 flex-1 basis-32 space-y-1.5">
                  <span className="block break-words text-title text-fg"><span className="sr-only">{i + 1}. </span>{ex.nombre}</span>
                  <span className="flex flex-wrap gap-1.5">
                    <Badge>{objetivo ? `${textoObjetivo(objetivo)} reps` : 'Sin objetivo'}</Badge>
                    {calentamientos && <Badge>{calentamientos}</Badge>}
                    {agarre && <Badge>{agarre}</Badge>}
                  </span>
                  <span className="tabular block break-words text-body-sm text-fg-muted">
                    {ultimas.has(id) ? <>Última vez: <span className="font-semibold text-fg">{ultimas.get(id)}</span></> : 'Sin hacer todavía'}
                  </span>
                </span>
              </Card>
            </li>
          })}
        </ol> : <EmptyState>Esta rutina no tiene ejercicios. Añádelos con «Editar».</EmptyState>}
      </section>

      {sesiones.ultimas.length > 0 && <section aria-label="Últimas sesiones" className="space-y-stack">
        <SectionHeader variant="section">Últimas sesiones</SectionHeader>
        <ListGroup aria-label="Últimas sesiones de la rutina">
          {sesiones.ultimas.map((s) => <li key={s.id}>
            <ListRow onClick={() => onAbrirEntreno(s.id)}>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-body font-medium text-fg">{formatFechaHoraConDia(s.inicio)}</span>
                <span className="tabular block break-words text-caption text-fg-muted">{[formatDuracion(s.fin - s.inicio), s.volumen > 0 ? `${formatInt(s.volumen)} kg` : null].filter(Boolean).join(' · ')}</span>
              </span>
              {s.records > 0 && <span className="tabular inline-flex shrink-0 items-center gap-1 text-label text-accent-strong">
                <Icon name="trophy" size={16} />{formatInt(s.records)}<span className="sr-only"> {s.records === 1 ? 'récord' : 'récords'}</span>
              </span>}
              <Icon name="chevron-right" size={18} className="shrink-0 text-fg-muted" />
            </ListRow>
          </li>)}
        </ListGroup>
      </section>}

      <section aria-label="Borrar rutina" className="space-y-2 border-t border-line pt-3">
        {confirmandoBorrado ? (
          <ConfirmacionDestructiva mensaje={`¿Borrar la rutina «${r.nombre}»? No se puede deshacer. Tus entrenos ya hechos no se borran.`} confirmar="Sí, borrar"
            onConfirmar={borrar} onCancelar={() => setConfirmandoBorrado(false)} ocupado={ocupado} />
        ) : <Button variant="destructive" block disabled={ocupado} onClick={() => { setError(null); setConfirmandoBorrado(true) }}>Borrar rutina</Button>}
      </section>

      {editando > 0 && <EditorRutina key={editando} inicial={r} onClose={() => setEditando(0)} onBorrada={onVolver} />}
    </div>
  )
}
