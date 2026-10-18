import { formatInt } from '../../../shared/lib/format'
import { agruparRecords, formatoRecord } from '../lib/records'
import type { ResumenEntreno } from '../lib/publicacion'

export default function RecordsPublicacion({ resumen: r, detalle = false }: { resumen: ResumenEntreno; detalle?: boolean }) {
  const grupos = agruparRecords(r.records)
  const total = r.recordsTotal ?? r.records.length
  const ejercicios = r.recordsEjercicios ?? grupos.length
  if (!total) return null
  const visibles = detalle ? r.records : grupos.slice(0, ejercicios > 3 ? 1 : 3).map(g => g[0])
  return <div className="space-y-1">
    <p className="text-label text-fg-muted">{`${formatInt(total)} ${total === 1 ? 'récord' : 'récords'} en ${formatInt(ejercicios)} ${ejercicios === 1 ? 'ejercicio' : 'ejercicios'}`}</p>
    <ul className="space-y-1" aria-label={detalle ? 'Detalle de récords' : 'Récords principales'}>
      {visibles.map((record, i) => {
        const formato = formatoRecord(record)
        return <li key={i} className="break-words text-body-sm text-fg">
          <span className="font-semibold">{record.ejercicio}{record.variante ? ` · ${record.variante}` : ''}</span>{' · '}
          <span className="tabular-nums">{formato.ahora}</span>
          {detalle ? formato.antes && <span className="text-fg-muted">{` · Antes: ${formato.antes}`}</span> : formato.mejora && <span className="tabular-nums text-accent-strong">{` · ${formato.mejora}`}</span>}
        </li>
      })}
    </ul>
    {!detalle && total > visibles.length && <p className="text-caption text-fg-muted">{`+${formatInt(total - visibles.length)} récords · Ver detalle`}</p>}
    {detalle && total > r.records.length && <p className="text-caption text-fg-muted">{`Se muestran ${formatInt(r.records.length)} de ${formatInt(total)} récords.`}</p>}
  </div>
}
