import Icon from '../../../shared/components/Icon'
import { formatInt } from '../../../shared/lib/format'
import InsigniaLiga from '../../liga/components/InsigniaLiga'
import type { PanelEjercicio } from '../lib/presentacion'

/** Un ejercicio desplegado del mosaico: la insignia y el texto de su liga, cada serie y la subida del récord en la suya. */
export default function PanelEjercicioPublicacion({ ejercicio, panel: p }: { ejercicio: string; panel: PanelEjercicio }) {
  return <section aria-label={ejercicio} className="space-y-2 rounded-md bg-surface-muted p-3">
    <div className="flex flex-wrap items-center gap-3">
      {p.liga && <InsigniaLiga liga={p.liga} />}
      <div className="min-w-0 flex-1 basis-40">
        <p className="break-words text-body font-semibold text-fg">{ejercicio}</p>
        {(p.liga || p.cambio) && <p className="break-words text-body-sm text-fg-muted">
          {p.liga && <span className="font-semibold text-fg">Liga {p.liga}</span>}{p.liga && p.cambio && ' · '}{p.cambio}
        </p>}
      </div>
    </div>
    {p.series.length > 0 && <ol aria-label="Series" className="divide-y divide-line border-t border-line">
      {p.series.map((s, i) => <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
        <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface text-caption font-semibold text-fg">{formatInt(i + 1)}</span>
        <span className="min-w-0 flex-1 basis-24 break-words font-numeric text-title text-fg tabular-nums">{s.texto}</span>
        {s.mejora && <span className="ml-auto inline-flex items-center gap-1 text-body-sm font-semibold text-accent-strong">
          <Icon name="chevron-up" size={16} /><span className="sr-only">Récord: </span>{s.mejora}
        </span>}
      </li>)}
    </ol>}
    {p.mejoras.length > 0 && <ul aria-label={`Récord de ${ejercicio}`} className="divide-y divide-line border-t border-line">
      {p.mejoras.map((m, i) => <li key={i} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
        <span className="min-w-0 break-words text-body-sm text-fg-muted">{m.variante ?? 'Récord de peso'}</span>
        <span className="inline-flex shrink-0 items-center gap-1 font-numeric text-title text-accent-strong tabular-nums"><Icon name="chevron-up" size={18} />{m.mejora}</span>
      </li>)}
    </ul>}
  </section>
}
