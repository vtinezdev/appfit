import Icon from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import { formatDiaMes, formatFechaHora } from '../../../shared/lib/dates'
import { formatNumber } from '../../../shared/lib/format'

export interface FilaSesionEjercicio {
  id: number
  inicio: number
  /** La mejor serie («77,5 kg × 8»). */
  mejor: string
  /** La cifra de la métrica elegida. */
  valor: number
  gimnasio?: string
}

const conSigno = (v: number) => `${v > 0 ? '+' : '−'}${formatNumber(Math.abs(v), 1)}`

/**
 * Las sesiones de un ejercicio (de la más reciente a la más antigua) en la métrica elegida (punto 40). `barras`: cada una
 * con una barra de su cifra frente a las demás, así se ve la progresión, y el trofeo cuando supera todo lo anterior.
 * `tabla`: una línea por sesión, con fecha, mejor serie, cifra y cambio frente a la anterior.
 */
export default function SesionesEjercicio({ filas, unidad, nombre, forma = 'barras' }: { filas: FilaSesionEjercicio[]; unidad: string; nombre: string; forma?: 'barras' | 'tabla' }) {
  const valores = filas.map(f => f.valor)
  const max = Math.max(...valores)
  const min = Math.min(...valores)
  // La barra parte un poco por debajo de la peor sesión: así las diferencias se ven sin exagerarlas.
  const base = Math.max(0, min - (max - min || max) * 0.25)
  const ancho = (v: number) => Math.max(8, ((v - base) / Math.max(1e-9, max - base)) * 100)
  // Récord: supera a todas las sesiones anteriores (las filas van de la más reciente a la más antigua).
  const record = (i: number) => i < filas.length - 1 && filas.slice(i + 1).every(f => filas[i].valor > f.valor)

  return <ListGroup aria-label={`Sesiones de ${nombre}`}>
    {filas.map((f, i) => {
      const anterior = filas[i + 1]
      const cambio = anterior ? f.valor - anterior.valor : 0
      const etiqueta = `${formatFechaHora(f.inicio)}${f.gimnasio ? `, ${f.gimnasio}` : ''}. Mejor serie: ${f.mejor}. ${formatNumber(f.valor, 1)} ${unidad}${cambio ? `, ${conSigno(cambio)} frente a la anterior` : ''}${record(i) ? '. Récord' : ''}`
      if (forma === 'tabla') return <li key={f.id} aria-label={etiqueta} className="grid min-h-touch grid-cols-4 items-center gap-2 py-2">
        <span aria-hidden className="tabular text-body-sm font-semibold text-fg">{formatDiaMes(f.inicio)}</span>
        <span aria-hidden className="tabular col-span-2 break-words text-body-sm text-fg-muted">{f.mejor}</span>
        <span aria-hidden className="tabular text-right text-body-sm font-semibold text-fg">{formatNumber(f.valor, 1)}
          {cambio !== 0 && <span className={`block text-caption ${cambio > 0 ? 'text-success' : 'text-fg-muted'}`}>{conSigno(cambio)}</span>}
        </span>
      </li>
      return <li key={f.id} aria-label={etiqueta} className="space-y-1 py-3">
        <div aria-hidden className="flex items-baseline justify-between gap-3">
          <span className="tabular text-body-sm font-semibold text-fg">{formatDiaMes(f.inicio)}{f.gimnasio ? <span className="font-normal text-fg-muted"> · {f.gimnasio}</span> : null}</span>
          <span className="tabular text-caption text-fg-muted">{f.mejor}</span>
        </div>
        <div aria-hidden className="flex items-center gap-3">
          <span className="h-7 flex-1 overflow-hidden rounded-sm bg-surface-muted">
            <span className={`flex h-full items-center justify-end rounded-sm px-2 ${record(i) ? 'bg-accent text-accent-on' : 'bg-line-strong text-fg'}`} style={{ width: `${ancho(f.valor)}%` }}>
              {record(i) && <Icon name="trophy" size={14} />}
            </span>
          </span>
          <span className="tabular w-20 shrink-0 text-right text-body-sm font-semibold text-fg">{formatNumber(f.valor, 1)} <span className="font-normal text-fg-muted">{unidad}</span></span>
        </div>
      </li>
    })}
  </ListGroup>
}
