import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import * as exercisesRepo from '../data/exercisesRepo'
import * as routinesRepo from '../data/routinesRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import TarjetaEntreno from '../components/TarjetaEntreno'
import RegistrarEntrenoPasado from '../components/RegistrarEntrenoPasado'
import { ChipGimnasio } from '../components/GimnasioSheet'
import RepetirEntreno from '../components/RepetirEntreno'
import { MosaicoRutina } from '../components/RutinaResumen'
import ListGroup from '../../../shared/components/ListGroup'
import SectionHeader from '../../../shared/components/SectionHeader'
import { ErrorState } from '../../../shared/components/StateMessage'
import { ordenParaEmpezar, resumenRutina } from '../lib/rutinas'
import { cuandoFue } from '../lib/workout'

const ERROR_EMPEZAR = 'No se ha podido empezar el entreno. Inténtalo de nuevo.'

/**
 * Empezar (E1, ADR 035): arriba, sobre grafito, «Tu entreno» con las formas de empezar sin rutina: «Empezar entreno»
 * (vacío, la principal), repetir uno terminado y registrar uno pasado. Debajo, las rutinas en filas del mismo alto
 * (mosaico, nombre en dos líneas como mucho y cuándo se hizo), de la que más tiempo lleva sin hacerse a la más reciente
 * (su última fecha real, no un plan), con «Empezar». El chip de gimnasio vale para empezar y registrar; siempre parte del
 * habitual, para no dejar elegido uno de fuera al volver a casa (ADR 054). Repetir conserva el del entreno repetido.
 */
interface Props {
  /** Hay un entreno en curso (minimizado): en lugar de empezar otro, se ofrece volver a él. */
  enCurso: boolean
  /** Abre la sesión recién empezada. */
  onEmpezado: () => void
  onRegistrado: (id: number) => void
  /** Abre la ficha de una rutina. */
  onAbrirRutina: (id: number) => void
}

export default function GymHome({ enCurso, onEmpezado, onRegistrado, onAbrirRutina }: Props) {
  const [pasado, setPasado] = useState(0)
  const [repetir, setRepetir] = useState(0)
  const [empezando, setEmpezando] = useState<number | 'vacio' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [gimnasio, setGimnasio] = useState<number | undefined>(undefined)
  const rutinas = useLiveQuery(() => routinesRepo.listar(), [])
  const exercises = useLiveQuery(() => exercisesRepo.listar(), [])
  const workouts = useLiveQuery(() => workoutsRepo.listar(), [])

  const exerciseMap = new Map((exercises ?? []).map((e) => [e.id!, e]))
  const resumenes = new Map((rutinas ?? []).map((r) => [r.id, resumenRutina(r, workouts ?? [], exerciseMap)]))
  const ordenadas = rutinas && exercises && workouts ? ordenParaEmpezar(rutinas, (r) => resumenes.get(r.id)?.ultima ?? null) : []

  async function empezar(routineId?: number) {
    setEmpezando(routineId ?? 'vacio')
    setError(null)
    try {
      await workoutsRepo.empezar(routineId, gimnasio)
      onEmpezado()
    } catch {
      setError(ERROR_EMPEZAR)
    } finally {
      setEmpezando(null)
    }
  }

  const ocupado = empezando !== null
  const hayTerminados = (workouts ?? []).some((w) => w.fin !== undefined)

  if (enCurso) {
    return (
      <div className="space-y-section">
        <TarjetaEntreno onAbrir={onEmpezado} />
        <Button variant="subtle" block onClick={() => setPasado((n) => n + 1)}>Registrar entreno pasado</Button>
        {pasado > 0 && <RegistrarEntrenoPasado key={pasado} open gimnasioId={gimnasio} onClose={() => setPasado(0)} onRegistrado={onRegistrado} />}
      </div>
    )
  }

  return (
    <div className="space-y-section">
      <section aria-labelledby="empezar-entreno" className="training-surface space-y-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h2 id="empezar-entreno" className="break-words text-display">Tu entreno</h2>
            <p className="training-muted text-body-sm">Empieza con los ejercicios que quieras{rutinas?.length === 0 ? ' o crea una rutina en la pestaña Rutinas' : ''}.</p>
          </div>
          <Icon name="dumbbell" size={28} className="training-muted mt-1 shrink-0" />
        </div>
        <ChipGimnasio gimnasioId={gimnasio} disabled={ocupado} onElegir={async id => setGimnasio(id)} />
        <Button variant="ghost" size="lg" block className="training-primary" loading={empezando === 'vacio'} disabled={ocupado} onClick={() => empezar()}>
          <Icon name="play" size={20} />
          Empezar entreno
        </Button>
        <div className="flex flex-wrap gap-2">
          {hayTerminados && <Button variant="ghost" className="training-secondary flex-1 basis-40" disabled={ocupado} onClick={() => setRepetir((n) => n + 1)}>Repetir un entreno</Button>}
          <Button variant="ghost" className="training-secondary flex-1 basis-40" disabled={ocupado} onClick={() => setPasado((n) => n + 1)}>Registrar entreno pasado</Button>
        </div>
      </section>

      {error && <ErrorState>{error}</ErrorState>}

      {ordenadas.length > 0 && <section aria-labelledby="rutinas-empezar" className="space-y-stack">
        <SectionHeader variant="section"><span id="rutinas-empezar">Rutinas</span></SectionHeader>
        <ListGroup aria-label="Rutinas">
          {ordenadas.map((r) => {
            const resumen = resumenes.get(r.id)!
            return <li key={r.id} className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => onAbrirRutina(r.id)} className="app-button flex min-h-touch min-w-0 flex-1 basis-48 items-center gap-3 py-3 text-left">
                <MosaicoRutina resumen={resumen} />
                {/* Mismo alto en todas: el nombre reserva dos líneas (y no pasa de ellas); el nombre entero sigue en el botón. */}
                <span className="rutina-fila-texto min-w-0 flex-1">
                  <span className="line-clamp-2 break-words text-body font-semibold text-fg">{r.nombre}</span>
                  <span className="block truncate text-caption text-fg-muted">{resumen.ultima === null ? 'Sin hacer' : cuandoFue(resumen.ultima)}</span>
                </span>
              </button>
              <Button variant="secondary" size="sm" className="ml-auto shrink-0" aria-label={`Empezar ${r.nombre}`} loading={empezando === r.id} disabled={ocupado} onClick={() => empezar(r.id)}>Empezar</Button>
            </li>
          })}
        </ListGroup>
      </section>}

      {/* Sin «Último entreno» (punto 14): cada rutina ya dice cuándo se hizo y el historial, el resto. */}
      {pasado > 0 && <RegistrarEntrenoPasado key={pasado} open gimnasioId={gimnasio} onClose={() => setPasado(0)} onRegistrado={onRegistrado} />}
      {repetir > 0 && <RepetirEntreno key={repetir} open onClose={() => setRepetir(0)} onRepetido={onEmpezado} />}
    </div>
  )
}
