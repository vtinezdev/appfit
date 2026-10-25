import Badge from '../../../shared/components/Badge'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import { formatInt } from '../../../shared/lib/format'
import MiniaturaEjercicio from './MiniaturaEjercicio'
import { partesRecord, recordsPorEjercicio } from '../lib/fichaEntreno'
import type { RecordEjercicio } from '../lib/records'

interface Props {
  records: RecordEjercicio[]
  /** Récords en total, si `records` es solo una parte (la revisión semanal enseña los primeros). */
  total?: number
  nombres: Record<number, string>
  catalogIds?: Record<number, string | undefined>
  /** Dentro de un bloque plegable que ya lo titula (fin de sesión, ENT-10): sin el encabezado propio. */
  sinTitulo?: boolean
}

/** Récords personales de un entreno frente a los anteriores: una card por ejercicio y cada récord como cifra con su mejora. */
export default function RecordsSesion({ records, total = records.length, nombres, catalogIds = {}, sinTitulo = false }: Props) {
  return <section aria-label="Récords personales" className="space-y-stack">
    {!sinTitulo && <h2 className="flex items-center gap-2 text-heading text-fg">
      <Icon name="trophy" size={22} className="shrink-0 text-accent-strong" />
      <span className="min-w-0 break-words">Récords personales</span>
      <Badge tone="accent">{formatInt(total)}<span className="sr-only"> {total === 1 ? 'récord' : 'récords'}</span></Badge>
    </h2>}
    <ul aria-label="Récords conseguidos" className="space-y-stack">
      {recordsPorEjercicio(records).map(({ exerciseId, records: delEjercicio }) => <li key={exerciseId}>
        <Card className="space-y-3">
          <div className="flex items-center gap-3">
            <MiniaturaEjercicio catalogId={catalogIds[exerciseId]} />
            <p className="min-w-0 break-words text-title text-fg">{nombres[exerciseId] ?? 'Ejercicio'}</p>
          </div>
          <ul className="grid grid-cols-2 gap-2">
            {delEjercicio.map((r, i) => {
              const p = partesRecord(r)
              return <li key={`${r.tipo}-${r.peso ?? 0}-${i}`} className="min-w-0 rounded-md bg-accent-subtle px-3 py-2">
                <p className="break-words text-rotulo text-fg-muted">{p.rotulo}</p>
                <p className="tabular break-words font-numeric text-title text-fg">{p.valor}</p>
                <p className="tabular break-words text-label text-accent-strong">{p.mejora}</p>
                {p.variante && <p className="break-words text-caption text-fg-muted">{p.variante}</p>}
              </li>
            })}
          </ul>
        </Card>
      </li>)}
    </ul>
  </section>
}
