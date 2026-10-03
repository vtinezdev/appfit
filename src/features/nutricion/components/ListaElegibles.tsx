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
          <ListRow tone="flat" onClick={() => onElegir(a)} className="items-start">
            <span className="min-w-0 flex-1">
              <span className="block break-words text-body font-medium">{a.nombre}</span>
              <span className="tabular mt-1 block text-caption text-fg-muted">{formatInt(a.kcal100)} kcal por 100 {a.ml ? 'ml' : 'g'}</span>
              {a.detalle && <span className="block truncate text-caption text-fg-subtle">{a.detalle}</span>}
            </span>
          </ListRow>
        </li>
      ))}
    </ul>
  )
}
