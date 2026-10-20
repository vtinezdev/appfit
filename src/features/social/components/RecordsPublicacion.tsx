import Icon from '../../../shared/components/Icon'
import { formatInt } from '../../../shared/lib/format'
import MiniaturaEjercicio from '../../gym/components/MiniaturaEjercicio'
import { agruparRecords, formatoRecord } from '../lib/records'
import type { LineaLogro, ResumenEntreno } from '../lib/publicacion'

/** El récord principal de cada ejercicio, hasta este número; el resto se reconoce por el trofeo en Ejercicios. */
const VISIBLES = 2

const nombre = (r: LineaLogro) => `${r.ejercicio}${r.variante ? ` · ${r.variante}` : ''}`
const catalogDe = (r: ResumenEntreno, ejercicio: string) => r.catalogIds?.[r.ejercicios.indexOf(ejercicio)] ?? undefined

/** Una marca como fila de marcador: imagen, ejercicio y marca anterior; la nueva cifra y la mejora a la derecha. */
function FilaMarcador({ r, record }: { r: ResumenEntreno; record: LineaLogro }) {
  const f = formatoRecord(record)
  return <li className="flex items-center gap-3 py-2">
    <span className="h-10 w-10 shrink-0 overflow-hidden rounded-sm"><MiniaturaEjercicio catalogId={catalogDe(r, record.ejercicio)} mosaico /></span>
    <span className="min-w-0 flex-1">
      <span className="block break-words text-body-sm font-semibold text-fg">{nombre(record)}</span>
      {f.antes && <span className="block break-words text-caption text-fg-muted tabular-nums">Antes: {f.antes}</span>}
    </span>
    <span className="shrink-0 text-right">
      <span className="block font-numeric text-title text-fg tabular-nums">{f.ahora}</span>
      {f.mejora && <span className="inline-flex items-center gap-0.5 text-caption font-semibold text-accent-strong tabular-nums"><Icon name="chevron-up" size={14} />{f.mejora}</span>}
    </span>
  </li>
}

/** Récords de un entreno publicado, como marcador: el principal de cada ejercicio, hasta dos. */
export default function RecordsPublicacion({ resumen: r }: { resumen: ResumenEntreno }) {
  const total = r.recordsTotal ?? r.records.length
  if (!total) return null
  const ejercicios = r.recordsEjercicios ?? agruparRecords(r.records).length
  const titulo = `${formatInt(total)} ${total === 1 ? 'récord' : 'récords'}${ejercicios > 1 ? ` en ${formatInt(ejercicios)} ejercicios` : ''}`
  const lista = agruparRecords(r.records).map(g => g[0]).slice(0, VISIBLES)
  return <section aria-label="Récords" className="space-y-1">
    <p className="flex items-center gap-2 text-label text-fg-muted"><Icon name="trophy" size={16} className="text-accent-strong" />{titulo}</p>
    <ul className="divide-y divide-line">{lista.map((record, i) => <FilaMarcador key={i} r={r} record={record} />)}</ul>
  </section>
}
