import Icon from '../../../shared/components/Icon'
import { formatInt } from '../../../shared/lib/format'
import { agruparRecords, formatoRecord } from '../lib/records'
import type { LineaLogro, ResumenEntreno } from '../lib/publicacion'

const nombre = (r: LineaLogro) => `${r.ejercicio}${r.variante ? ` · ${r.variante}` : ''}`

/**
 * Récords de un entreno publicado. En la tarjeta, una franja con el recuento y el principal de cada ejercicio (hasta
 * dos); en el detalle, todos con su marca anterior.
 */
export default function RecordsPublicacion({ resumen: r, detalle = false }: { resumen: ResumenEntreno; detalle?: boolean }) {
  const grupos = agruparRecords(r.records)
  const total = r.recordsTotal ?? r.records.length
  const ejercicios = r.recordsEjercicios ?? grupos.length
  if (!total) return null
  const titulo = `${formatInt(total)} ${total === 1 ? 'récord' : 'récords'}${ejercicios > 1 ? ` en ${formatInt(ejercicios)} ejercicios` : ''}`
  if (!detalle) {
    const principales = grupos.slice(0, 2).map(g => g[0])
    return <div className="flex items-start gap-3 rounded-md bg-surface-muted px-3 py-2">
      <Icon name="trophy" size={20} className="mt-0.5 text-accent-strong" />
      <div className="min-w-0">
        <p className="text-body-sm font-semibold text-fg">{titulo}</p>
        <ul aria-label="Récords principales" className="break-words text-caption text-fg-muted">
          {principales.map((record, i) => {
            const formato = formatoRecord(record)
            return <li key={i}>{nombre(record)}{' · '}<span className="tabular-nums">{formato.ahora}</span>{formato.mejora && <span className="tabular-nums">{` (${formato.mejora})`}</span>}</li>
          })}
        </ul>
      </div>
    </div>
  }
  return <div className="space-y-1">
    <p className="text-label text-fg-muted">{titulo}</p>
    <ul className="space-y-1" aria-label="Detalle de récords">
      {r.records.map((record, i) => {
        const formato = formatoRecord(record)
        return <li key={i} className="break-words text-body-sm text-fg">
          <span className="font-semibold">{nombre(record)}</span>{' · '}
          <span className="tabular-nums">{formato.ahora}</span>
          {formato.antes && <span className="text-fg-muted">{` · Antes: ${formato.antes}`}</span>}
        </li>
      })}
    </ul>
    {total > r.records.length && <p className="text-caption text-fg-muted">{`Se muestran ${formatInt(r.records.length)} de ${formatInt(total)} récords.`}</p>}
  </div>
}
