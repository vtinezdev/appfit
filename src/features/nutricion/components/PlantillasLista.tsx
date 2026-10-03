import { useLiveQuery } from 'dexie-react-hooks'
import type { Meal } from '../../../shared/db/types'
import * as mealsRepo from '../data/mealsRepo'
import ListRow from '../../../shared/components/ListRow'
import SectionHeader from '../../../shared/components/SectionHeader'
import { EmptyState, LoadingState } from '../../../shared/components/StateMessage'

interface Props {
  onElegir: (meal: Meal) => void
}

/** Sección «Plantillas» en AnadirComida (A1), ordenada por `usadoAt` (igual que `mealsRepo.listar`). Lista plana con hairlines. */
export default function PlantillasLista({ onElegir }: Props) {
  const plantillas = useLiveQuery(() => mealsRepo.listar(), [])

  if (!plantillas) return <LoadingState />
  if (plantillas.length === 0) return <EmptyState title="Tus comidas de siempre" icon="copy">Guarda una comida como plantilla desde su menú en Nutrición.</EmptyState>

  return (
    <section aria-label="Plantillas" className="space-y-1">
      <SectionHeader variant="section">Plantillas</SectionHeader>
      <ul className="divide-y divide-line">
        {plantillas.map((m) => (
          <li key={m.id}>
            <ListRow tone="flat" onClick={() => onElegir(m)}>
              <span className="line-clamp-2 min-w-0 flex-1 text-body-sm font-medium">{m.nombre}</span>
              <span className="shrink-0 text-caption text-fg-subtle">
                {m.items.length} alimento{m.items.length === 1 ? '' : 's'}
              </span>
            </ListRow>
          </li>
        ))}
      </ul>
    </section>
  )
}
