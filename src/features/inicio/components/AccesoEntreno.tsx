import { useLiveQuery } from 'dexie-react-hooks'
import { formatInt } from '../../../shared/lib/format'
import * as setsRepo from '../../gym/data/setsRepo'
import * as workoutsRepo from '../../gym/data/workoutsRepo'
import { formatHora, resumenUltimoEntreno } from '../../gym/lib/workout'
import TarjetaAcceso from './TarjetaAcceso'

/** Entreno en Inicio: la sesión en curso o el último entreno terminado (solo lectura). Toda la tarjeta abre Gym. */
export default function AccesoEntreno({ onAbrir }: { onAbrir: () => void }) {
  const activo = useLiveQuery(async () => ((await workoutsRepo.activo()) ?? null), [])
  const ultimo = useLiveQuery(async () => {
    const w = await workoutsRepo.ultimoTerminado()
    return w ? { workout: w, sets: await setsRepo.delWorkout(w.id) } : null
  }, [])

  const cargando = activo === undefined || ultimo === undefined
  const resumen = ultimo ? resumenUltimoEntreno(ultimo.workout, ultimo.sets) : null
  const detalle = resumen ? [resumen.duracion, resumen.volumen > 0 ? `${formatInt(resumen.volumen)} kg` : null].filter(Boolean).join(' · ') : ''

  return (
    <TarjetaAcceso etiqueta="Entreno" onAbrir={onAbrir}>
      {cargando ? null : activo ? <>
        <span className="text-title text-accent-strong">En curso</span>
        <span className="tabular text-body-sm text-fg-muted">Desde {formatHora(activo.inicio)}</span>
      </> : resumen ? <>
        <span className="text-title text-fg">{resumen.cuando}</span>
        {detalle && <span className="tabular text-body-sm text-fg-muted">{detalle}</span>}
      </> : <>
        <span className="text-title text-fg">Sin entrenos</span>
        <span className="text-body-sm text-fg-muted">Empieza el primero</span>
      </>}
    </TarjetaAcceso>
  )
}
