import ListRow from '../../../shared/components/ListRow'
import type { Montana } from '../lib/montanas'
import { metrosTexto } from '../lib/cumbres'

interface Props {
  montanas: readonly Montana[]
  onElegir: (m: Montana) => void
  /** Montaña marcada como sugerida (la primera de la ruta). */
  sugerida?: string
  tone?: 'plain' | 'muted'
  disabled?: boolean
}

/** Montañas para elegir: nombre, zona y altitud. Cada fila elige al tocarla. */
export default function ListaMontanas({ montanas, onElegir, sugerida, tone = 'plain', disabled = false }: Props) {
  return <>
    {montanas.map((m) => <li key={m.id}>
      <ListRow tone={tone} disabled={disabled} onClick={() => onElegir(m)} aria-label={`${m.nombre}, ${metrosTexto(m.altitud)}${m.id === sugerida ? ', sugerida' : ''}`}>
        <span className="min-w-0">
          <span className="block break-words text-body font-semibold text-fg">{m.nombre}{m.id === sugerida && <span className="ml-2 text-caption font-normal text-fg-muted">Sugerida</span>}</span>
          <span className="block break-words text-body-sm text-fg-muted">{m.zona}</span>
        </span>
        <span className="tabular shrink-0 text-body-sm text-fg">{metrosTexto(m.altitud)}</span>
      </ListRow>
    </li>)}
  </>
}
