import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import * as exercisesRepo from '../data/exercisesRepo'
import * as routinesRepo from '../data/routinesRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import Button from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import TarjetaEntreno from '../components/TarjetaEntreno'
import RegistrarEntrenoPasado from '../components/RegistrarEntrenoPasado'
import RepetirEntreno from '../components/RepetirEntreno'
import { detalleRutina, MosaicoRutina } from '../components/RutinaResumen'
import { ErrorState } from '../../../shared/components/StateMessage'
import { ordenParaEmpezar, resumenRutina } from '../lib/rutinas'
import { cuandoFue } from '../lib/workout'

const ERROR_EMPEZAR = 'No se ha podido empezar el entreno. Inténtalo de nuevo.'

/**
 * Empezar (E1, ADR 035): las rutinas a la vista, sin abrir otra hoja. Arriba, sobre grafito, la que hace más tiempo que
 * no se hace (por su última fecha real, no es un plan); debajo, las demás con su mosaico y «Empezar». Entreno vacío, registrar uno
 * pasado y repetir uno terminado quedan como acciones secundarias. Sin rutinas, la tarjeta invita a empezar en vacío.
 */
interface Props {
  /** Hay un entreno en curso (minimizado): en lugar de empezar otro, se ofrece volver a él. */
  enCurso: boolean
  /** Abre la sesión recién empezada. */
  onEmpezado: () => void
  onRegistrado: (id: number) => void
}

export default function GymHome({ enCurso, onEmpezado, onRegistrado }: Props) {
  const [pasado, setPasado] = useState(0)
  const [repetir, setRepetir] = useState(0)
  const [empezando, setEmpezando] = useState<number | 'vacio' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const rutinas = useLiveQuery(() => routinesRepo.listar(), [])
  const exercises = useLiveQuery(() => exercisesRepo.listar(), [])
  const workouts = useLiveQuery(() => workoutsRepo.listar(), [])

  const exerciseMap = new Map((exercises ?? []).map((e) => [e.id!, e]))
  const resumenes = new Map((rutinas ?? []).map((r) => [r.id, resumenRutina(r, workouts ?? [], exerciseMap)]))
  const ordenadas = rutinas && exercises && workouts ? ordenParaEmpezar(rutinas, (r) => resumenes.get(r.id)?.ultima ?? null) : []
  const [primera, ...resto] = ordenadas

  async function empezar(routineId?: number) {
    setEmpezando(routineId ?? 'vacio')
    setError(null)
    try {
      await workoutsRepo.empezar(routineId)
      onEmpezado()
    } catch {
      setError(ERROR_EMPEZAR)
    } finally {
      setEmpezando(null)
    }
  }

  const ocupado = empezando !== null
  const hayTerminados = (workouts ?? []).some((w) => w.fin !== undefined)
  const botonRepetir = hayTerminados && <Button variant="subtle" className="flex-1 basis-40" disabled={ocupado} onClick={() => setRepetir((n) => n + 1)}>Repetir un entreno</Button>
  const nombresDe = (ids: number[]) => ids.map((id) => exerciseMap.get(id)?.nombre).filter(Boolean).slice(0, 3).join(' · ')

  if (enCurso) {
    return (
      <div className="space-y-section">
        <TarjetaEntreno onAbrir={onEmpezado} />
        <Button variant="subtle" block onClick={() => setPasado((n) => n + 1)}>Registrar entreno pasado</Button>
        <TarjetaEntreno soloUltimo />
        {pasado > 0 && <RegistrarEntrenoPasado key={pasado} open onClose={() => setPasado(0)} onRegistrado={onRegistrado} />}
      </div>
    )
  }

  return (
    <div className="space-y-section">
      {primera ? (() => {
        const resumen = resumenes.get(primera.id)!
        return <section aria-label="Empezar a entrenar" className="training-surface space-y-4 p-5">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="training-muted text-rotulo">{resumen.ultima === null ? 'Sin hacer todavía' : `Última vez: ${cuandoFue(resumen.ultima).toLowerCase()}`}</p>
              <h2 className="break-words text-display">{primera.nombre}</h2>
              {nombresDe(primera.exerciseIds) && <p className="training-muted break-words text-body-sm">{nombresDe(primera.exerciseIds)}</p>}
            </div>
            <MosaicoRutina resumen={resumen} />
          </div>
          <Button variant="ghost" size="lg" block className="training-primary" loading={empezando === primera.id} disabled={ocupado} onClick={() => empezar(primera.id)}>
            Empezar {primera.nombre}
          </Button>
        </section>
      })() : (
        <section aria-label="Empezar a entrenar" className="training-surface space-y-5 p-5">
          <div className="space-y-1">
            <div className="flex items-start justify-between gap-3"><h2 className="min-w-0 break-words text-display">Tu próxima sesión</h2><Icon name="dumbbell" size={28} className="training-muted mt-1" /></div>
            <p className="training-muted text-body-sm">Empieza con los ejercicios que quieras{rutinas?.length === 0 ? ' o crea una rutina en la pestaña Rutinas' : ''}.</p>
          </div>
          <Button variant="ghost" className="training-secondary" size="lg" block loading={empezando === 'vacio'} disabled={ocupado} onClick={() => empezar()}>
            <Icon name="plus" size={20} />
            Entreno vacío
          </Button>
        </section>
      )}

      {error && <ErrorState>{error}</ErrorState>}

      {primera && <section aria-label="Más rutinas y otras formas de empezar" className="space-y-stack">
        {resto.length > 0 && <ul aria-label="Otras rutinas" className="space-y-stack">
          {resto.map((r) => {
            const resumen = resumenes.get(r.id)!
            return <li key={r.id}>
              <Card padded={false} className="flex flex-wrap items-center gap-3 p-4">
                <MosaicoRutina resumen={resumen} />
                <span className="min-w-0 flex-1 basis-32">
                  <span className="block break-words text-title text-fg">{r.nombre}</span>
                  <span className="tabular block break-words text-caption text-fg-muted">{detalleRutina(r, resumen)}</span>
                </span>
                <Button variant="secondary" size="sm" className="ml-auto" loading={empezando === r.id} disabled={ocupado} aria-label={`Empezar ${r.nombre}`} onClick={() => empezar(r.id)}>Empezar</Button>
              </Card>
            </li>
          })}
        </ul>}
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" className="flex-1 basis-40" loading={empezando === 'vacio'} disabled={ocupado} onClick={() => empezar()}>
            <Icon name="plus" size={18} />
            Entreno vacío
          </Button>
          <Button variant="subtle" className="flex-1 basis-40" onClick={() => setPasado((n) => n + 1)}>Registrar entreno pasado</Button>
          {botonRepetir}
        </div>
      </section>}
      {!primera && <div className="flex flex-wrap gap-2">
        <Button variant="subtle" className="flex-1 basis-40" onClick={() => setPasado((n) => n + 1)}>Registrar entreno pasado</Button>
        {botonRepetir}
      </div>}

      <TarjetaEntreno soloUltimo />

      {pasado > 0 && <RegistrarEntrenoPasado key={pasado} open onClose={() => setPasado(0)} onRegistrado={onRegistrado} />}
      {repetir > 0 && <RepetirEntreno key={repetir} open onClose={() => setRepetir(0)} onRepetido={onEmpezado} />}
    </div>
  )
}
