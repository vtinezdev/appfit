import { useState } from 'react'
import { formatInt } from '../../../shared/lib/format'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Comida, Food } from '../../../shared/db/types'
import { todayISO } from '../../../shared/lib/dates'
import * as foodsRepo from '../data/foodsRepo'
import ListRow from '../../../shared/components/ListRow'
import { SearchInput } from '../../../shared/components/Input'
import { EmptyState } from '../../../shared/components/StateMessage'
import SectionHeader from '../../../shared/components/SectionHeader'

interface Props {
  comida: Comida
  onElegir: (food: Food) => void
}

const EN_LA_COMIDA: Record<Comida, string> = {
  desayuno: 'el desayuno',
  comida: 'la comida',
  cena: 'la cena',
  snack: 'el snack',
}

/**
 * Añadido rápido sin IA (funciona sin conexión): buscador y una lista de selección. Sin búsqueda muestra los alimentos
 * que más usas en esa comida; con búsqueda, los que coinciden de todos tus alimentos. Lista plana con hairlines, como las comidas de Hoy.
 */
export default function AlimentosRapidos({ comida, onElegir }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const hoy = todayISO()
  const frecuentes = useLiveQuery(() => foodsRepo.frecuentes({ comida, hoy }), [comida, hoy])
  const resultados = useLiveQuery(() => (busqueda.trim() ? foodsRepo.buscar(busqueda) : undefined), [busqueda])

  // Sin ningún alimento guardado no hay nada que añadir rápido.
  if (!frecuentes || frecuentes.length === 0) return null

  const buscando = busqueda.trim() !== ''
  const lista = buscando ? (resultados ?? []) : frecuentes

  return (
    <section aria-label="Tus alimentos" className="space-y-3">
      <SearchInput tone="surface" aria-label="Buscar en tus alimentos" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar en tus alimentos…" />
      <div className="space-y-1">
        <SectionHeader>{buscando ? 'Resultados' : `Frecuentes en ${EN_LA_COMIDA[comida]}`}</SectionHeader>
        {/* Anuncia el número de resultados mientras se escribe. */}
        <p role="status" className="sr-only">
          {buscando && resultados ? `${resultados.length} resultados` : ''}
        </p>
        {buscando && resultados && lista.length === 0 && <EmptyState>Sin coincidencias en tus alimentos.</EmptyState>}
        {lista.length > 0 && (
          <ul key={buscando ? 'resultados' : 'frecuentes'} className="animate-fade-in divide-y divide-line">
            {lista.map((f) => (
              <li key={f.id}>
                <ListRow tone="flat" onClick={() => onElegir(f)}>
                  <span className="line-clamp-2 min-w-0 flex-1 text-body-sm font-medium">{f.nombre}</span>
                  <span className="tabular shrink-0 text-right">
                    <span className="text-body-sm text-fg">{formatInt(f.kcal100)}</span> <span className="text-caption text-fg-subtle">kcal/100 g</span>
                  </span>
                </ListRow>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
