import Card from '../../../shared/components/Card'
import ListGroup from '../../../shared/components/ListGroup'
import ProgressBar from '../../../shared/components/ProgressBar'
import { todayISO } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import { useAtributos } from '../hooks/useAtributos'
import { describirSinXp, tituloDe, xpDeSesion } from '../lib/atributos'
import FilasXp from './FilasXp'

/**
 * Bajo el póster al terminar un entreno: la XP que da (entreno y récords) con su porqué, o por qué no suma, y el nivel
 * con la subida si la hay. Sin contador ni celebración animada. No aparece si los atributos están ocultos.
 */
export default function XpSesion({ workoutId }: { workoutId: number }) {
  const hoy = todayISO()
  const estado = useAtributos(hoy)
  if (!estado?.visible) return null
  const s = xpDeSesion(estado.resultado, workoutId)
  const n = s.despues
  const sube = n.nivel > s.antes.nivel
  return <section aria-label="Experiencia" className="space-y-2">
    <h2 className="flex flex-wrap items-baseline justify-between gap-x-3 text-heading text-fg">
      Experiencia<span className="tabular text-title">{s.total > 0 ? `+${formatInt(s.total)}` : '0'} XP</span>
    </h2>
    {s.sinXp
      ? <p className="break-words text-body-sm text-fg-muted">Este entreno no suma XP. {describirSinXp(s.sinXp, hoy)}.</p>
      : <ListGroup aria-label="XP de este entreno"><FilasXp eventos={s.eventos} nombres={estado.nombres} /></ListGroup>}
    <Card className="space-y-2">
      <p className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-title text-fg">{sube ? `Subes al nivel ${formatInt(n.nivel)}` : `Nivel ${formatInt(n.nivel)}`}</span>
        <span className="text-body-sm text-fg-muted">{tituloDe(n.nivel)}</span>
      </p>
      <ProgressBar value={n.xpEnNivel} goal={n.xpSiguiente} colorClass="bg-fg" label={`Experiencia del nivel ${n.nivel}`}
        valueText={`${formatInt(n.xpEnNivel)} de ${formatInt(n.xpSiguiente)} XP`} />
      <p className="tabular text-caption text-fg-muted">{formatInt(n.xpEnNivel)} de {formatInt(n.xpSiguiente)} XP para el nivel {formatInt(n.nivel + 1)}</p>
    </Card>
  </section>
}
