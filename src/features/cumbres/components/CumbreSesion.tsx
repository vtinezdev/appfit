import Card from '../../../shared/components/Card'
import { todayISO } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import { useCumbres } from '../hooks/useCumbres'
import { cumbreDeSesion, diasDeExpedicion, metrosTexto, progresoTexto } from '../lib/cumbres'

/**
 * Bajo «Experiencia» al terminar un entreno: si hace cumbre, una card con la montaña y la siguiente; después, los metros
 * que sube (también los de la cumbre) y cómo va la montaña actual, con el hito que pasa. Sin animación. Nada si Cumbres no ha empezado o está oculta.
 */
export default function CumbreSesion({ workoutId }: { workoutId: number }) {
  const estado = useCumbres(todayISO())
  if (!estado?.visible || !estado.cumbres) return null
  const c = estado.cumbres
  const s = cumbreDeSesion(c, workoutId)
  const hito = c.actual?.hitos.filter((h) => h.workoutId === workoutId).at(-1)
  return <div className="space-y-2">
    {s.cumbres.map((x) => {
      const dias = diasDeExpedicion(x)
      const siguiente = c.expediciones[c.expediciones.indexOf(x) + 1]
      return <Card key={x.montana.id} className="space-y-1">
        <p className="break-words text-title text-fg">Cumbre del {x.montana.nombre}</p>
        <p className="tabular break-words text-body-sm text-fg-muted">{metrosTexto(x.montana.altitud)}{dias !== null ? ` · en ${dias === 1 ? '1 día' : `${formatInt(dias)} días`}` : ''}</p>
        <p className="break-words text-body-sm text-fg">{siguiente ? `Ahora, el ${siguiente.montana.nombre} (${metrosTexto(siguiente.montana.altitud)}).` : 'Has coronado todas las montañas de la ruta.'}</p>
      </Card>
    })}
    {c.actual && <div>
      <p className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="break-words text-body font-semibold text-fg">Montaña · {c.actual.montana.nombre}</span>
        <span className="tabular text-body text-fg">{s.metros > 0 ? `+${metrosTexto(s.metros)}` : '0 m'}</span>
      </p>
      <p className="tabular break-words text-body-sm text-fg-muted">{progresoTexto(c.actual)}{hito ? ` · pasas los ${metrosTexto(hito.metros)}` : ''}</p>
    </div>}
  </div>
}
