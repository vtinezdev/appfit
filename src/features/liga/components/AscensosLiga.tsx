import Disclosure from '../../../shared/components/Disclosure'
import ListGroup from '../../../shared/components/ListGroup'
import { todayISO } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import { useLigas } from '../hooks/useLigas'
import { ascensosDeEntreno, type Ascenso } from '../lib/liga'
import { ascensoDestacado, textoAscenso } from '../lib/textos'
import InsigniaLiga from './InsigniaLiga'

function Filas({ ascensos, nombres }: { ascensos: Ascenso[]; nombres: Record<number, string> }) {
  return ascensos.map((a) => <li key={a.exerciseId} className="flex items-center gap-3 py-3">
    <InsigniaLiga liga={a.a.liga} size={32} />
    <span className="min-w-0">
      <span className="block break-words text-body font-semibold text-fg">{nombres[a.exerciseId] ?? 'Ejercicio'}</span>
      <span className="block break-words text-body-sm text-fg-muted">{textoAscenso(a)}</span>
    </span>
  </li>)
}

/**
 * Al terminar un entreno: lo que avanza cada ejercicio (solo la primera sesión de la semana con él). Empezar, subir de
 * liga y llegar a Élite, a la vista; las semanas que solo suman, en un desplegable. Nada si no avanza ninguno o la
 * gamificación está oculta.
 */
export default function AscensosLiga({ workoutId, nombres }: { workoutId: number; nombres: Record<number, string> }) {
  const estado = useLigas(todayISO())
  if (!estado?.visible) return null
  const ascensos = ascensosDeEntreno(estado.ligas, workoutId)
  if (!ascensos.length) return null
  const destacados = ascensos.filter(ascensoDestacado)
  const resto = ascensos.filter((a) => !ascensoDestacado(a))
  return <section aria-label="Ligas" className="space-y-2">
    <h2 className="text-heading text-fg">Ligas</h2>
    {destacados.length > 0 && <ListGroup aria-label="Cambios de liga con este entreno"><Filas ascensos={destacados} nombres={nombres} /></ListGroup>}
    {resto.length > 0 && (destacados.length
      ? <Disclosure title={`${resto.length === 1 ? 'Otro ejercicio suma' : `${formatInt(resto.length)} ejercicios más suman`} una semana`}>
          <ListGroup variante="plana" aria-label="Ejercicios que suman una semana"><Filas ascensos={resto} nombres={nombres} /></ListGroup>
        </Disclosure>
      : <ListGroup aria-label="Ejercicios que suman una semana"><Filas ascensos={resto} nombres={nombres} /></ListGroup>)}
  </section>
}
