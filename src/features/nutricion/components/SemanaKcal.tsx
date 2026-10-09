import type { ReactNode } from 'react'
import { IconButton } from '../../../shared/components/Button'
import { addDays, esPeriodoActual, formatFriendly, parseISODate } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import type { DiaSemanaKcal } from '../lib/semanaKcal'

interface Props {
  fecha: string
  hoy: string
  dias: DiaSemanaKcal[] | undefined
  onFecha: (fecha: string) => void
  /** Acciones del día a la derecha del título («Copiar el día»). */
  acciones?: ReactNode
  /** Clase de transición del título al cambiar de día. */
  transicion?: string
}

const fechaLarga = (iso: string) => parseISODate(iso).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

/**
 * Semana arriba del diario: cada día con su barrita de kcal frente a la línea de su objetivo. El elegido va resaltado
 * y en naranja; los futuros, atenuados y sin acción. Las flechas cambian de semana conservando el día de la semana.
 */
export default function SemanaKcal({ fecha, hoy, dias, onFecha, acciones, transicion = '' }: Props) {
  const siguiente = addDays(fecha, 7)
  return <section aria-label="Semana" className="space-y-2">
    <div className="flex items-center gap-1">
      <IconButton icon="chevron-left" label="Semana anterior" variant="ghost" onClick={() => onFecha(addDays(fecha, -7))} />
      <h2 key={fecha} aria-live="polite" className={`min-w-0 flex-1 text-center text-body font-semibold text-fg first-letter:uppercase ${transicion}`}>{formatFriendly(fecha)}</h2>
      <IconButton icon="chevron-right" label="Semana siguiente" variant="ghost" disabled={esPeriodoActual('semana', fecha)} onClick={() => onFecha(siguiente > hoy ? hoy : siguiente)} />
      {acciones}
    </div>
    <ul className="semana-kcal" aria-label="Días de la semana">
      {(dias ?? []).map(d => {
        const elegido = d.fecha === fecha
        const texto = `${fechaLarga(d.fecha)}${d.hoy ? ' (hoy)' : ''}${d.futuro ? '' : `: ${formatInt(d.kcal)}${d.objetivo > 0 ? ` de ${formatInt(d.objetivo)}` : ''} kcal`}`
        return <li key={d.fecha}>
          <button type="button" className="semana-dia app-button" aria-label={texto} aria-current={elegido ? 'date' : undefined} data-hoy={d.hoy} disabled={d.futuro} onClick={() => onFecha(d.fecha)}>
            <span className="semana-letra" aria-hidden="true">{d.letra}</span>
            <span className="semana-zona" aria-hidden="true">
              {d.alto > 0 && <span className="semana-barra" style={{ height: `${Math.max(d.alto * 100, 4)}%` }} />}
              {d.meta !== null && <span className="semana-meta" style={{ bottom: `${d.meta * 100}%` }} />}
            </span>
            <span className="semana-num tabular" aria-hidden="true">{d.numero}</span>
          </button>
        </li>
      })}
    </ul>
  </section>
}
