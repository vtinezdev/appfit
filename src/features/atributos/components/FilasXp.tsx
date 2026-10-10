import { formatInt } from '../../../shared/lib/format'
import { describirEvento, describirSinXp, type EntrenoSinXp, type EventoXp } from '../lib/atributos'

/** Filas `<li>` de una lista de XP: qué la dio, su porqué y cuánta; y los entrenos que no sumaron, con el motivo. */
export default function FilasXp({ eventos, sinXp = [], nombres, hoy }: { eventos: EventoXp[]; sinXp?: EntrenoSinXp[]; nombres: Readonly<Record<number, string>>; hoy?: string }) {
  return <>
    {eventos.map((e, i) => {
      const { titulo, detalle } = describirEvento(e, nombres)
      return <li key={`${e.tipo}-${i}`} className="flex items-start justify-between gap-3 py-3">
        <span className="min-w-0">
          <span className="block break-words text-body font-medium text-fg">{titulo}</span>
          <span className="tabular block break-words text-body-sm text-fg-muted">{detalle}</span>
        </span>
        <span className="tabular shrink-0 text-body font-semibold text-fg">+{formatInt(e.xp)}</span>
      </li>
    })}
    {sinXp.map((s) => <li key={`sin-${s.workoutId}`} className="py-3">
      <span className="block text-body font-medium text-fg">Entreno sin XP</span>
      <span className="tabular block break-words text-body-sm text-fg-muted">{describirSinXp(s, hoy)}</span>
    </li>)}
  </>
}
