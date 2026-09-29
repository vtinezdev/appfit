import { useState } from 'react'
import { formatInt } from '../../../shared/lib/format'
import { useLiveQuery } from 'dexie-react-hooks'
import { claveRef } from '../../../shared/db/foodRef'
import type { Comida } from '../../../shared/db/types'
import { todayISO } from '../../../shared/lib/dates'
import * as catalogRepo from '../data/catalogRepo'
import * as foodsRepo from '../data/foodsRepo'
import { useBusquedaCatalogo } from '../hooks/useBusquedaCatalogo'
import { elegibleDeFood, type AlimentoElegible } from '../lib/alimentos'
import ListRow from '../../../shared/components/ListRow'
import { SearchInput } from '../../../shared/components/Input'
import { EmptyState } from '../../../shared/components/StateMessage'
import SectionHeader from '../../../shared/components/SectionHeader'

interface Props {
  comida: Comida
  onElegir: (alimento: AlimentoElegible) => void
}

const EN_LA_COMIDA: Record<Comida, string> = {
  desayuno: 'el desayuno',
  comida: 'la comida',
  cena: 'la cena',
  snack: 'el snack',
}

const SIN_CATALOGO = 'El catálogo de alimentos aún no se ha descargado: se descarga solo al abrir la app con conexión.'

/** Lista plana con hairlines, como las comidas de Hoy. Nombres a 2 líneas; la categoría del catálogo, debajo. */
function ListaElegibles({ alimentos, onElegir }: { alimentos: AlimentoElegible[]; onElegir: (a: AlimentoElegible) => void }) {
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

/**
 * Añadido rápido sin IA (funciona sin conexión): buscador y listas de selección. Sin búsqueda muestra lo que más
 * usas en esa comida (tuyo o del catálogo); con búsqueda, primero tus alimentos y después el catálogo.
 */
export default function AlimentosRapidos({ comida, onElegir }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const hoy = todayISO()
  const frecuentes = useLiveQuery(() => foodsRepo.frecuentes({ comida, hoy }), [comida, hoy])
  const propios = useLiveQuery(async () => (busqueda.trim() ? (await foodsRepo.buscar(busqueda)).map(elegibleDeFood) : undefined), [busqueda])
  const enCatalogo = useLiveQuery(() => catalogRepo.contar(), [])
  const catalogo = useBusquedaCatalogo(busqueda)

  if (frecuentes === undefined) return null

  const buscando = busqueda.trim() !== ''
  const listo = buscando && propios !== undefined && !catalogo.pendiente
  const total = (propios?.length ?? 0) + catalogo.alimentos.length
  const catalogoVacio = enCatalogo === 0

  return (
    <section aria-label="Buscar alimentos" className="space-y-3">
      <SearchInput
        tone="surface"
        aria-label="Buscar en tus alimentos y en el catálogo"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar alimento…"
      />
      {/* Anuncia el número de resultados mientras se escribe. */}
      <p role="status" className="sr-only">
        {listo ? `${total} resultados` : ''}
      </p>

      {!buscando && frecuentes.length > 0 && (
        <div className="space-y-1">
          <SectionHeader>Frecuentes en {EN_LA_COMIDA[comida]}</SectionHeader>
          <ListaElegibles alimentos={frecuentes} onElegir={onElegir} />
        </div>
      )}

      {buscando && propios && propios.length > 0 && (
        <div className="space-y-1">
          <SectionHeader>Tus alimentos</SectionHeader>
          <ListaElegibles alimentos={propios} onElegir={onElegir} />
        </div>
      )}

      {buscando && catalogo.alimentos.length > 0 && (
        <div className="space-y-1">
          <SectionHeader>Catálogo</SectionHeader>
          <ListaElegibles alimentos={catalogo.alimentos} onElegir={onElegir} />
        </div>
      )}

      {listo && total === 0 && <EmptyState>{catalogoVacio ? `Sin coincidencias en tus alimentos. ${SIN_CATALOGO}` : 'Sin coincidencias.'}</EmptyState>}
      {listo && total > 0 && catalogoVacio && <EmptyState>{SIN_CATALOGO}</EmptyState>}
    </section>
  )
}
