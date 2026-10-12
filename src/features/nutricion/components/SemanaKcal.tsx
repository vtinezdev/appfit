import type { ReactNode } from 'react'
import Anillo from '../../../shared/components/Anillo'
import { IconButton } from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import { addDays, esPeriodoActual, formatFriendly, parseISODate } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import type { DiaSemanaKcal } from '../lib/semanaKcal'

interface Props {
  fecha: string
  hoy: string
  dias: DiaSemanaKcal[] | undefined
  onFecha: (fecha: string) => void
  /** Acciones del día a la derecha del título (copiar el día, cheat day). */
  acciones?: ReactNode
  /** Bajo la semana, centrado: el control del cheat day del día elegido. */
  nota?: ReactNode
  /** Clase de transición del título al cambiar de día. */
  transicion?: string
}

const fechaLarga = (iso: string) => parseISODate(iso).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

/**
 * Semana arriba del diario: el número de cada día dentro de un anillo de sus kcal frente a su objetivo. El elegido va en
 * grafito sólido (el acento queda para actuar); los futuros, sin anillo, atenuados y sin acción; los cheat days, con un
 * destello junto a la letra. Las flechas cambian de semana conservando el día de la semana.
 */
export default function SemanaKcal({ fecha, hoy, dias, onFecha, acciones, nota, transicion = '' }: Props) {
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
        const texto = `${fechaLarga(d.fecha)}${d.hoy ? ' (hoy)' : ''}${d.futuro ? '' : `: ${formatInt(d.kcal)}${d.objetivo > 0 ? ` de ${formatInt(d.objetivo)}` : ''} kcal`}${d.cheat ? ', cheat day' : ''}`
        return <li key={d.fecha}>
          <button type="button" className="semana-dia app-button" aria-label={texto} aria-current={elegido ? 'date' : undefined} data-hoy={d.hoy} disabled={d.futuro} onClick={() => onFecha(d.fecha)}>
            <span className="semana-letra" aria-hidden="true">{d.letra}{d.cheat && <Icon name="sparkles" size={12} className="semana-cheat" />}</span>
            <Anillo fraccion={d.anillo} className="semana-anillo" trazo="stroke-kcal" carril={d.futuro ? 'stroke-transparent' : 'stroke-line'}>
              <span className="semana-num tabular" aria-hidden="true">{d.numero}</span>
            </Anillo>
          </button>
        </li>
      })}
    </ul>
    {nota && <div className="flex justify-center">{nota}</div>}
  </section>
}
