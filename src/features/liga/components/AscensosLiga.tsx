import Disclosure from '../../../shared/components/Disclosure'
import Icon from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import { todayISO } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import { useLigas } from '../hooks/useLigas'
import { ascensosDeEntreno, type Ascenso } from '../lib/liga'
import { ascensoDestacado, textoAscenso } from '../lib/textos'

function Filas({ ascensos, nombres }: { ascensos: Ascenso[]; nombres: Record<number, string> }) {
  return ascensos.map((a) => <li key={a.exerciseId} className="py-3">
    <p className="break-words text-body font-semibold text-fg">{nombres[a.exerciseId] ?? 'Ejercicio'}</p>
    <p className="break-words text-body-sm text-fg-muted">{textoAscenso(a)}</p>
  </li>)
}

/**
 * Al terminar un entreno: las divisiones que sube (solo la primera sesión de la semana con cada ejercicio). Los cambios de
 * liga y Élite, a la vista; el resto, en un desplegable. Nada si no sube ninguno o la gamificación está oculta.
 */
export default function AscensosLiga({ workoutId, nombres }: { workoutId: number; nombres: Record<number, string> }) {
  const estado = useLigas(todayISO())
  if (!estado?.visible) return null
  const ascensos = ascensosDeEntreno(estado.ligas, workoutId)
  if (!ascensos.length) return null
  const destacados = ascensos.filter(ascensoDestacado)
  const resto = ascensos.filter((a) => !ascensoDestacado(a))
  return <section aria-label="Ligas" className="space-y-2">
    <h2 className="flex items-center gap-2 text-heading text-fg"><Icon name="rank" size={22} className="text-fg" />Ligas</h2>
    {destacados.length > 0 && <ListGroup aria-label="Cambios de liga con este entreno"><Filas ascensos={destacados} nombres={nombres} /></ListGroup>}
    {resto.length > 0 && (destacados.length
      ? <Disclosure title={`${resto.length === 1 ? 'Otro ejercicio sube' : `${formatInt(resto.length)} ejercicios más suben`} una división`}>
          <ListGroup variante="plana" aria-label="Ejercicios que suben una división"><Filas ascensos={resto} nombres={nombres} /></ListGroup>
        </Disclosure>
      : <ListGroup aria-label="Ejercicios que suben una división"><Filas ascensos={resto} nombres={nombres} /></ListGroup>)}
  </section>
}
