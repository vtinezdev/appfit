import { useId, useState } from 'react'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import { formatInt } from '../../../shared/lib/format'
import type { Exercise, SetEntry } from '../../../shared/db/types'
import MiniaturaEjercicio from './MiniaturaEjercicio'
import { formatearCarga } from '../lib/carga'
import { contextoSerie, describirReps } from '../lib/ejecucion'
import { pastillaSerie, resumenEjercicio, type PastillaSerie } from '../lib/fichaEntreno'

type Marca = 'efectiva' | 'calentamiento' | 'pendiente' | 'record'

const MARCAS: Record<Marca, string> = {
  efectiva: 'bg-surface-muted font-semibold text-fg',
  calentamiento: 'border border-line font-medium text-fg-muted',
  pendiente: 'border border-dashed border-line-strong font-medium text-fg-subtle',
  record: 'bg-accent font-semibold text-accent-on',
}

const marca = (p: PastillaSerie, record: boolean): Marca => (p.pendiente ? 'pendiente' : p.calentamiento ? 'calentamiento' : record ? 'record' : 'efectiva')

/** Una serie como pastilla no pulsable: el estado se ve en la forma (borde, discontinuo, acento) y se anuncia en texto. */
function Pastilla({ p, record }: { p: PastillaSerie; record: boolean }) {
  const m = marca(p, record)
  return <li className={`tabular inline-flex min-h-8 max-w-full items-center gap-1 break-words rounded-pill px-3 py-1 text-body-sm ${MARCAS[m]}`}>
    {p.calentamiento && <span aria-hidden className="text-caption font-bold">C</span>}
    {record && !p.pendiente && <Icon name="trophy" size={14} className="shrink-0" />}
    <span className="sr-only">{[p.calentamiento && 'Calentamiento', p.pendiente && 'Pendiente', record && 'Récord'].filter(Boolean).join(', ')}{(p.calentamiento || p.pendiente || record) && ': '}</span>
    <span className="min-w-0">{p.texto}</span>
    {p.bajadas > 0 && <span className="text-caption font-medium opacity-80">+ {p.bajadas === 1 ? 'bajada' : `${formatInt(p.bajadas)} bajadas`}</span>}
  </li>
}

/** Qué significa cada forma de pastilla; solo las que aparecen en el entreno. Visual: el texto de cada pastilla ya lo anuncia. */
export function LeyendaSeries({ calentamiento, pendiente, record }: { calentamiento: boolean; pendiente: boolean; record: boolean }) {
  if (!calentamiento && !pendiente && !record) return null
  const muestra = 'inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-caption'
  return <p aria-hidden className="flex flex-wrap gap-2">
    {calentamiento && <span className={`${muestra} ${MARCAS.calentamiento}`}><span className="font-bold">C</span>calentamiento</span>}
    {pendiente && <span className={`${muestra} ${MARCAS.pendiente}`}>pendiente</span>}
    {record && <span className={`${muestra} ${MARCAS.record}`}><Icon name="trophy" size={12} />récord</span>}
  </p>
}

interface Props {
  ejercicio?: Pick<Exercise, 'nombre' | 'catalogId'>
  /** Series del ejercicio en ese entreno, ya en orden. */
  series: SetEntry[]
  /** Ids de las series que marcan récord. */
  records: ReadonlySet<number>
  nota?: string
}

/**
 * Un ejercicio de un entreno terminado: miniatura, nombre, resumen y las series como pastillas. Al tocar la cabecera se
 * despliega el detalle (tabla con RIR, ejecución, agarre, bajadas y la nota del ejercicio).
 */
export default function EjercicioSesion({ ejercicio, series, records, nota }: Props) {
  const [abierto, setAbierto] = useState(false)
  const id = useId()
  const nombre = ejercicio?.nombre ?? '…'
  const conRecord = series.some(s => records.has(s.id))
  const conRir = series.some(s => s.rir !== undefined || Object.values(s.lados ?? {}).some(l => l?.rir !== undefined))
  let n = 0
  return <Card padded={false} className="overflow-hidden">
    <button type="button" aria-expanded={abierto} aria-controls={id} onClick={() => setAbierto(!abierto)}
      className="flex min-h-touch w-full items-center gap-3 px-card py-3 text-left">
      <MiniaturaEjercicio catalogId={ejercicio?.catalogId} />
      <span className="min-w-0 flex-1">
        <span className="block break-words text-title text-fg">{nombre}</span>
        <span className="tabular block break-words text-body-sm text-fg-muted">{resumenEjercicio(series)}</span>
      </span>
      {nota && <Icon name="comentario" size={18} label="Con nota" className="shrink-0 text-fg-muted" />}
      {conRecord && <Icon name="trophy" size={20} label="Con récord" className="shrink-0 text-accent-strong" />}
      <Icon name="chevron-down" size={20} className={`shrink-0 text-fg-muted transition-transform duration-short motion-reduce:transition-none ${abierto ? 'rotate-180' : ''}`} />
    </button>
    {series.length > 0 && <ul aria-label={`Series de ${nombre}`} className="flex flex-wrap gap-2 px-card pb-4">
      {series.map(s => <Pastilla key={s.id} p={pastillaSerie(s)} record={records.has(s.id)} />)}
    </ul>}
    <div id={id} hidden={!abierto} className="space-y-2 border-t border-line px-card pb-4 pt-3">
      <table className="tabular w-full table-fixed break-words text-body-sm">
        <thead>
          <tr className="text-left text-label text-fg-muted">
            <th className="w-20 pb-1 font-semibold">Serie</th>
            <th className="pb-1 text-right font-semibold">Carga</th>
            <th className="pb-1 text-right font-semibold">Reps</th>
            {conRir && <th className="w-12 pb-1 text-right font-semibold">RIR</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {series.map(s => <tr key={s.id}>
            <td className="py-1.5 text-fg-muted">{s.tipo === 'calentamiento' ? 'C' : ++n}{s.realizada !== true && <span className="block text-caption">{s.realizada === false ? 'Pendiente' : 'Sin confirmar'}</span>}</td>
            <td className="py-1.5 text-right font-semibold text-fg">{s.ejecucion === 'lados' ? 'Por lado' : formatearCarga(s)}</td>
            <td className="py-1.5 text-right text-fg">{describirReps(s)}</td>
            {conRir && <td className="py-1.5 text-right text-fg-muted">{s.rir ?? '—'}</td>}
          </tr>)}
        </tbody>
      </table>
      {series.filter(s => contextoSerie(s)).map(s => <div key={s.id} className="space-y-1 text-caption text-fg-muted">
        <p>{contextoSerie(s)}</p>
        {s.ejecucion === 'lados' && conRir && <p>{Object.entries(s.lados ?? {}).map(([l, p]) => `${l}: RIR ${p.rir ?? '—'}`).join(' · ')}</p>}
        {s.bajadas?.map((b, i) => <p key={b.id}>Bajada {i + 1}: {describirReps({ ...s, ...b })}{s.ejecucion !== 'lados' ? ` · ${formatearCarga({ ...s, ...b })}` : ''}</p>)}
      </div>)}
      {nota && <p className="whitespace-pre-wrap break-words rounded-md bg-surface-muted px-3 py-2 text-body-sm text-fg">{nota}</p>}
    </div>
  </Card>
}
