import { useLiveQuery } from 'dexie-react-hooks'
import * as exercisesRepo from '../data/exercisesRepo'
import * as routinesRepo from '../data/routinesRepo'
import * as setsRepo from '../data/setsRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import { gruposDeSesion } from '../lib/resumenSemanal'
import { cuandoFue, formatDuracion, volumenSets } from '../lib/workout'
import { planDeSemana } from '../../ritmo/lib/plan'
import { getSettings } from '../../../shared/db/settings'
import { startOfWeek, todayISO, toISODate, weekDates } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import SectionHeader from '../../../shared/components/SectionHeader'
import DiaSesion from './DiaSesion'

const LETRAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const NOMBRES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

/**
 * «Esta semana» en Empezar (punto 14): los siete días con los entrenados marcados, cuántos llevas frente a tu plan de
 * Ritmo y el último entreno en una fila que abre su detalle. Nada si aún no hay ningún entreno terminado.
 */
export default function SemanaEntreno({ onAbrirSesion }: { onAbrirSesion: (id: number) => void }) {
  const hoy = todayISO()
  const lunes = startOfWeek(hoy)
  const datos = useLiveQuery(async () => {
    const terminados = await workoutsRepo.terminados()
    const ultimo = terminados[0]
    const series = ultimo ? await setsRepo.delWorkout(ultimo.id) : []
    const rutina = ultimo?.routineId !== undefined ? (await routinesRepo.listar()).find(r => r.id === ultimo.routineId)?.nombre : undefined
    return { terminados, ultimo, series, rutina, ejercicios: await exercisesRepo.listar(), settings: await getSettings() }
  }, [])
  if (!datos?.ultimo) return null
  const { terminados, ultimo, series, rutina, ejercicios, settings } = datos
  const entrenados = new Set(terminados.map(w => toISODate(new Date(w.inicio))))
  const dias = weekDates(lunes)
  const hechos = dias.filter(d => entrenados.has(d)).length
  const plan = planDeSemana(settings.planSemanal, lunes).entrenos
  const titulo = rutina ?? gruposDeSesion(ultimo, series, ejercicios) ?? 'Entreno libre'

  return <section aria-labelledby="semana-entreno" className="space-y-stack">
    <SectionHeader variant="section" action={<span className="tabular text-body-sm text-fg-muted">{formatInt(hechos)} de {formatInt(plan)} entrenos</span>}>
      <span id="semana-entreno">Esta semana</span>
    </SectionHeader>
    <Card className="space-y-4">
      <ol className="grid grid-cols-7 gap-1" aria-label="Días de esta semana">
        {dias.map((d, i) => {
          const hecho = entrenados.has(d)
          return <li key={d} className="flex min-w-0 flex-col items-center gap-1">
            <span aria-hidden className={`text-caption ${d === hoy ? 'font-bold text-fg' : 'text-fg-muted'}`}>{LETRAS[i]}</span>
            <span aria-hidden className={`flex aspect-square w-full max-w-9 items-center justify-center rounded-md ${hecho ? 'bg-accent text-accent-on' : d > hoy ? 'border border-dashed border-line-strong' : 'bg-surface-muted'} ${d === hoy && !hecho ? 'border-2 border-fg' : ''}`}>
              {hecho && <Icon name="check" size={18} />}
            </span>
            <span className="sr-only">{NOMBRES[i]}{d === hoy ? ' (hoy)' : ''}: {hecho ? 'entrenado' : d > hoy ? 'por llegar' : 'sin entreno'}</span>
          </li>
        })}
      </ol>
      <div className="border-t border-line pt-2">
      <button type="button" onClick={() => onAbrirSesion(ultimo.id)} className="app-button -mx-2 flex min-h-touch w-full items-center gap-3 rounded-md px-2 py-1 text-left">
        <DiaSesion inicio={ultimo.inicio} />
        <span className="min-w-0 flex-1">
          <span className="block text-caption text-fg-muted">Último entreno · {cuandoFue(ultimo.inicio).toLowerCase()}</span>
          <span className="block break-words text-body font-semibold text-fg">{titulo}</span>
          <span className="tabular block text-caption text-fg-muted">{ultimo.fin !== undefined ? `${formatDuracion(ultimo.fin - ultimo.inicio)} · ` : ''}{formatInt(volumenSets(series))} kg</span>
        </span>
        <Icon name="chevron-right" size={18} className="shrink-0 text-fg-subtle" />
      </button>
      </div>
    </Card>
  </section>
}
