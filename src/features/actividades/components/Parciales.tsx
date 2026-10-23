import Badge from '../../../shared/components/Badge'
import ListGroup from '../../../shared/components/ListGroup'
import SectionHeader from '../../../shared/components/SectionHeader'
import type { Actividad } from '../../../shared/db/types'
import { formatKm, formatReloj, formatRitmo } from '../lib/actividad'
import { kmMasRapido, parcialesPorKm, type ConTiempos } from '../lib/parciales'

/**
 * Parciales por km en el detalle (A28): el ritmo de cada kilómetro y el más rápido. Solo en las actividades con la hora de
 * cada punto (grabadas o importadas desde A28); en las demás no se muestra nada.
 */
export default function Parciales({ actividad }: { actividad: Actividad }) {
  const parciales = parcialesPorKm(actividad as Actividad & ConTiempos)
  if (parciales.length === 0) return null
  const rapido = kmMasRapido(parciales)
  return (
    <section aria-label="Parciales" className="space-y-stack">
      <SectionHeader variant="section">Parciales</SectionHeader>
      <ListGroup aria-label="Ritmo de cada kilómetro">
        {parciales.map((p) => <li key={p.km} className="flex min-h-touch flex-wrap items-center gap-x-3 gap-y-1 py-2">
          {/* En un km entero, su tiempo es su ritmo; el resto final dice también cuánto tardó. */}
          <span className="tabular min-w-touch text-body-sm font-semibold text-fg">{p.metros === 1000 ? `Km ${p.km}` : `${formatKm(p.metros)} km · ${formatReloj(Math.round(p.segundos))}`}</span>
          <span className="tabular min-w-0 flex-1 whitespace-nowrap text-body text-fg">{formatRitmo(p.ritmo)}</span>
          {p.km === rapido && <Badge tone="accent">Más rápido</Badge>}
        </li>)}
      </ListGroup>
    </section>
  )
}
