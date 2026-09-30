import { claveRef } from '../../../shared/db/foodRef'
import ListRow from '../../../shared/components/ListRow'
import { formatInt } from '../../../shared/lib/format'
import type { AlimentoElegible } from '../lib/alimentos'

interface Props {
  alimentos: AlimentoElegible[]
  onElegir: (alimento: AlimentoElegible) => void
}

/** Lista plana con hairlines, como las comidas de Hoy. Nombres a 2 líneas; la categoría del catálogo, debajo. */
export default function ListaElegibles({ alimentos, onElegir }: Props) {
  return (
    <ul className="animate-fade-in divide-y divide-line">
      {alimentos.map((a) => (
        <li key={claveRef(a.ref)}>
          <ListRow tone="flat" onClick={() => onElegir(a)}>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-body-sm font-medium">{a.nombre}</span>
              {a.detalle && <span className="block truncate text-caption text-fg-subtle">{a.detalle}</span>}
            </span>
            <span className="tabular shrink-0 text-right">
              <span className="text-body-sm text-fg">{formatInt(a.kcal100)}</span> <span className="text-caption text-fg-subtle">kcal/100 g</span>
            </span>
          </ListRow>
        </li>
      ))}
    </ul>
  )
}
