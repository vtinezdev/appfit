import { useLiveQuery } from 'dexie-react-hooks'
import Button from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import Metric from '../../../shared/components/Metric'
import SectionHeader from '../../../shared/components/SectionHeader'
import { EmptyState } from '../../../shared/components/StateMessage'
import { formatInt } from '../../../shared/lib/format'
import * as setsRepo from '../data/setsRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import { formatHora, resumenUltimoEntreno } from '../lib/workout'

interface Props {
  /** Lleva a Entreno. Sin él no hay acción (Gym ya es la pantalla de destino). */
  onAbrir?: () => void
  /** Solo el último entreno terminado, aunque haya uno en curso (Gym enseña el entreno activo aparte). */
  soloUltimo?: boolean
}

/**
 * Entreno en Gym: el entreno en curso («En curso desde 18:05») o, si no hay, el último terminado
 * (cuándo, duración, ejercicios y volumen). Solo lee datos que ya existen; la lógica está en `resumenUltimoEntreno`.
 */
export default function TarjetaEntreno({ onAbrir, soloUltimo = false }: Props) {
  const activo = useLiveQuery(async () => ((await workoutsRepo.activo()) ?? null), [])
  const ultimo = useLiveQuery(async () => {
    const w = await workoutsRepo.ultimoTerminado()
    return w ? { workout: w, sets: await setsRepo.delWorkout(w.id) } : null
  }, [])

  if (activo === undefined || ultimo === undefined) return null
  const resumen = ultimo ? resumenUltimoEntreno(ultimo.workout, ultimo.sets) : null

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

  // El título va sobre la card, como el resto de secciones; dentro solo quedan los datos.
  return (
    <section aria-label="Último entreno" className="space-y-stack">
      <SectionHeader variant="section" action={onAbrir && (
        <Button variant="ghost" size="sm" className="-mr-3" onClick={onAbrir}>
          Entreno
          <Icon name="chevron-right" size={16} />
        </Button>
      )}>Último entreno</SectionHeader>
      <Card className="space-y-4">
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
      </Card>
    </section>
  )
}
