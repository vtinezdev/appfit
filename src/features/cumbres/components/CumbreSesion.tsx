import Card from '../../../shared/components/Card'
import ListGroup from '../../../shared/components/ListGroup'
import { todayISO } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import { describirSinXp, xpDeSesion } from '../../experiencia/lib/experiencia'
import { useCumbres } from '../hooks/useCumbres'
import { cumbreDeSesion, diasDeExpedicion, metrosTexto, nombreExpedicion, progresoTexto } from '../lib/cumbres'
import FilasMetros from './FilasMetros'

/**
 * Bajo los récords al terminar un entreno: los metros que sube (entreno y récords) con su porqué, o por qué no sube; si
 * hace cumbre, una card con la montaña y la siguiente; y cómo va la montaña actual, con el hito que pasa. Sin animación.
 * Sin montaña elegida, una línea que invita a empezar. Nada si la gamificación está oculta.
 */
export default function CumbreSesion({ workoutId }: { workoutId: number }) {
  const hoy = todayISO()
  const estado = useCumbres(hoy)
  if (!estado?.visible) return null
  const c = estado.cumbres
  if (!c) {
    return <section aria-label="Cumbres" className="space-y-2">
      <h2 className="text-heading text-fg">Cumbres</h2>
      <p className="break-words text-body-sm text-fg-muted">Elige tu primera montaña en Inicio › Cumbres: desde ese día, cada entreno te sube metros.</p>
    </section>
  }
  const xp = xpDeSesion(estado.resultado, workoutId)
  const s = cumbreDeSesion(c, workoutId)
  const hito = c.actual.hitos.filter((h) => h.workoutId === workoutId).at(-1)
  return <section aria-label="Cumbres" className="space-y-2">
    <h2 className="flex flex-wrap items-baseline justify-between gap-x-3 text-heading text-fg">
      Cumbres<span className="tabular text-title">{s.metros > 0 ? `+${metrosTexto(s.metros)}` : '0 m'}</span>
    </h2>
    {xp.sinXp
      ? <p className="break-words text-body-sm text-fg-muted">Este entreno no sube metros. {describirSinXp(xp.sinXp, hoy)}.</p>
      : <ListGroup aria-label="Metros de este entreno"><FilasMetros eventos={xp.eventos} nombres={estado.nombres} /></ListGroup>}
    {xp.total > s.metros && s.cumbres.length > 0 && <p className="tabular break-words text-caption text-fg-muted">
      {metrosTexto(xp.total - s.metros)} se quedan en la cima: la siguiente montaña empieza desde el nivel del mar.
    </p>}
    {s.cumbres.map((x) => {
      const dias = diasDeExpedicion(x)
      const siguiente = c.expediciones[c.expediciones.indexOf(x) + 1]
      return <Card key={`${x.montana.id}-${x.vez}`} className="space-y-1">
        <p className="break-words text-title text-fg">Cumbre del {nombreExpedicion(x)}</p>
        <p className="tabular break-words text-body-sm text-fg-muted">{metrosTexto(x.montana.altitud)}{dias !== null ? ` · en ${dias === 1 ? '1 día' : `${formatInt(dias)} días`}` : ''}</p>
        {siguiente && <p className="break-words text-body-sm text-fg">Ahora, el {nombreExpedicion(siguiente)} ({metrosTexto(siguiente.montana.altitud)}).</p>}
      </Card>
    })}
    <Card className="space-y-1">
      <p className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="break-words text-body font-semibold text-fg">{nombreExpedicion(c.actual)}</span>
        <span className="tabular text-body-sm text-fg-muted">{progresoTexto(c.actual)}</span>
      </p>
      {hito && <p className="tabular break-words text-body-sm text-fg">Pasas los {metrosTexto(hito.metros)}.</p>}
    </Card>
  </section>
}
