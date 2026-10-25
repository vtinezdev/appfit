import { IconButton } from '../../../shared/components/Button'
import ListRow from '../../../shared/components/ListRow'
import { kmTexto } from '../../actividades/lib/actividad'
import { vecesTexto } from '../lib/caminos'
import { metrosRuta, type Ruta } from '../lib/rutas'

interface Props {
  rutas: readonly Ruta[]
  onElegir: (r: Ruta) => void
  /** Ruta marcada como sugerida (la primera de la ruta de capítulos). */
  sugerida?: string
  /** Veces que se ha terminado cada ruta, para decirlo en su fila. */
  veces?: ReadonlyMap<string, number>
  tone?: 'plain' | 'muted'
  disabled?: boolean
  /** Con él, cada fila lleva al lado un botón para editarla (rutas propias). */
  onEditar?: (r: Ruta) => void
}

/** Referencia de las barras: 1.000 km (las más largas la llenan). */
const KM_BARRA = 1000

/** Rutas para elegir: nombre, zona, etapas y km, con una barra fina proporcional a su longitud. Cada fila elige al tocarla. */
export default function ListaRutas({ rutas, onElegir, sugerida, veces, tone = 'plain', disabled = false, onEditar }: Props) {
  return <>
    {rutas.map((r) => {
      const m = metrosRuta(r)
      const hecha = veces?.has(r.id) ? ` · hecha ${vecesTexto(veces.get(r.id) ?? 0)}` : ''
      const etapas = `${r.etapas.length} ${r.etapas.length === 1 ? 'etapa' : 'etapas'}`
      return <li key={r.id} className={onEditar ? 'flex items-center gap-1' : undefined}>
        <ListRow className={onEditar ? 'min-w-0 flex-1' : undefined} tone={tone} disabled={disabled} onClick={() => onElegir(r)} aria-label={`${r.nombre}, ${kmTexto(m)}, ${etapas}${r.id === sugerida ? ', sugerida' : ''}${hecha}`}>
          <span className="min-w-0">
            <span className="block break-words text-body font-semibold text-fg">{r.nombre}{r.id === sugerida && <span className="ml-2 text-caption font-normal text-fg-muted">Sugerida</span>}</span>
            <span className="block break-words text-body-sm text-fg-muted">{r.zona} · {etapas}{hecha}</span>
            <span aria-hidden className="mt-1.5 block h-1 w-40 max-w-full overflow-hidden rounded-sm bg-line">
              <span className="block h-full rounded-sm bg-fg-subtle" style={{ width: `${Math.min(m / 1000 / KM_BARRA, 1) * 100}%` }} />
            </span>
          </span>
          <span className="tabular shrink-0 text-body-sm text-fg">{kmTexto(m)}</span>
        </ListRow>
        {onEditar && <IconButton icon="pencil" variant="ghost" label={`Editar ${r.nombre}`} disabled={disabled} onClick={() => onEditar(r)} />}
      </li>
    })}
  </>
}
