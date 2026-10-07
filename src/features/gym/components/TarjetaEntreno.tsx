import { useLiveQuery } from 'dexie-react-hooks'
import Button from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import Metric from '../../../shared/components/Metric'
import { EmptyState } from '../../../shared/components/StateMessage'
import { formatInt } from '../../../shared/lib/format'
import * as setsRepo from '../data/setsRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import { formatHora, resumenUltimoEntreno } from '../lib/workout'

interface Props {
  /** Lleva a Entreno (Inicio). Sin él no hay acción (Gym ya es la pantalla de destino). */
  onAbrir?: () => void
  /** Solo el último entreno terminado, aunque haya uno en curso (Gym enseña el entreno activo aparte). */
  soloUltimo?: boolean
  /** Acción protagonista de Inicio; conserva el resumen de registros reales. */
  destacado?: boolean
}

/**
 * Entreno en Inicio y en Gym: el entreno en curso («En curso desde 18:05») o, si no hay, el último terminado
 * (cuándo, duración, ejercicios y volumen). Solo lee datos que ya existen; la lógica está en `resumenUltimoEntreno`.
 */
export default function TarjetaEntreno({ onAbrir, soloUltimo = false, destacado = false }: Props) {
  const activo = useLiveQuery(async () => ((await workoutsRepo.activo()) ?? null), [])
  const ultimo = useLiveQuery(async () => {
    const w = await workoutsRepo.ultimoTerminado()
    return w ? { workout: w, sets: await setsRepo.delWorkout(w.id) } : null
  }, [])

  if (activo === undefined || ultimo === undefined) return null
  const resumen = ultimo ? resumenUltimoEntreno(ultimo.workout, ultimo.sets) : null

  if (destacado && onAbrir) return (
    <Card className="training-surface training-feature">
      <section aria-label={activo ? 'Entreno en curso' : 'Entrenamiento'} className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="break-words font-display text-display">{activo ? 'Entreno en curso' : 'Tu próxima sesión'}</h2>
            <p className="training-muted mt-2 text-body-sm">{activo ? `En curso desde ${formatHora(activo.inicio)}` : 'Elige una rutina o empieza a tu ritmo.'}</p>
          </div>
          <Icon name="dumbbell" size={28} className="training-muted mt-1" />
        </div>
        <Button size="lg" block onClick={onAbrir}>{activo ? 'Continuar' : 'Ir a entrenar'}<Icon name="chevron-right" size={20} /></Button>
        {!activo && resumen && <div className="training-previous space-y-3 pt-3">
          <p className="training-muted text-caption">Último entreno · {resumen.cuando}</p>
          <div className="grid grid-cols-3 gap-3">
            <Metric size="title" label="Duración" valor={resumen.duracion ?? '—'} />
            <Metric size="title" label="Ejercicios" valor={formatInt(resumen.ejercicios)} />
            <Metric size="title" label="Volumen" valor={formatInt(resumen.volumen)} unidad="kg" />
          </div>
        </div>}
      </section>
    </Card>
  )

  if (activo && !soloUltimo) {
    return (
      <Card className="training-surface">
        <section aria-label="Entreno en curso" className="space-y-stack">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-title">Entreno en curso</h2>
              <p className="training-muted tabular text-body-sm">En curso desde {formatHora(activo.inicio)}</p>
            </div>
            {onAbrir && (
              <Button size="sm" onClick={onAbrir}>
                Continuar
              </Button>
            )}
          </div>
        </section>
      </Card>
    )
  }

  return (
    <Card>
      <section aria-label="Último entreno" className="space-y-4">
        <div className="flex min-h-touch items-center justify-between gap-2">
          <h2 className="text-title text-fg">Último entreno</h2>
          {onAbrir && (
            <Button variant="ghost" size="sm" className="-mr-3" onClick={onAbrir}>
              Entreno
              <Icon name="chevron-right" size={16} />
            </Button>
          )}
        </div>
        {!resumen ? (
          <EmptyState action={onAbrir && <Button variant="secondary" block onClick={onAbrir}>Empezar entreno</Button>}>Todavía no hay un entreno terminado.</EmptyState>
        ) : (
          <>
            <p className="text-body-sm text-fg-muted">{resumen.cuando}</p>
            <div className="grid grid-cols-3 gap-4">
              <Metric size="title" label="Duración" valor={resumen.duracion ?? '—'} />
              <Metric size="title" label="Ejercicios" valor={formatInt(resumen.ejercicios)} />
              <Metric size="title" label="Volumen" valor={formatInt(resumen.volumen)} unidad="kg" />
            </div>
          </>
        )}
      </section>
    </Card>
  )
}
