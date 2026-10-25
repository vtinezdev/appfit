import ListRow from '../../../shared/components/ListRow'
import type { Montana } from '../lib/montanas'
import { metrosTexto, vecesTexto } from '../lib/cumbres'

interface Props {
  montanas: readonly Montana[]
  onElegir: (m: Montana) => void
  /** Montaña marcada como sugerida (la primera de la ruta). */
  sugerida?: string
  /** Veces que se ha coronado cada montaña, para decirlo en su fila. */
  veces?: ReadonlyMap<string, number>
  tone?: 'plain' | 'muted'
  disabled?: boolean
}

/** Altitud de referencia para las barras: la montaña más alta de la Tierra. */
const EVEREST = 8849

/**
 * Montañas para elegir: nombre, zona (y las veces que se coronó), altitud y una barra fina proporcional a ella (frente
 * al Everest), en grafito. Cada fila elige al tocarla.
 */
export default function ListaMontanas({ montanas, onElegir, sugerida, veces, tone = 'plain', disabled = false }: Props) {
  return <>
    {montanas.map((m) => <li key={m.id}>
      <ListRow tone={tone} disabled={disabled} onClick={() => onElegir(m)} aria-label={`${m.nombre}, ${metrosTexto(m.altitud)}${m.id === sugerida ? ', sugerida' : ''}${veces?.has(m.id) ? `, coronada ${vecesTexto(veces.get(m.id) ?? 0)}` : ''}`}>
        <span className="min-w-0">
          <span className="block break-words text-body font-semibold text-fg">{m.nombre}{m.id === sugerida && <span className="ml-2 text-caption font-normal text-fg-muted">Sugerida</span>}</span>
          <span className="block break-words text-body-sm text-fg-muted">{m.zona}{veces?.has(m.id) ? ` · coronada ${vecesTexto(veces.get(m.id) ?? 0)}` : ''}</span>
          <span aria-hidden className="mt-1.5 block h-1 w-40 max-w-full overflow-hidden rounded-sm bg-line">
            <span className="block h-full rounded-sm bg-fg-subtle" style={{ width: `${Math.min(m.altitud / EVEREST, 1) * 100}%` }} />
          </span>
        </span>
        <span className="tabular shrink-0 text-body-sm text-fg">{metrosTexto(m.altitud)}</span>
      </ListRow>
    </li>)}
  </>
}
