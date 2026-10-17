import FiltroCategoriaBusqueda from './FiltroCategoriaBusqueda'
import { filtrarPorCategoria, type FiltroCategoria } from '../lib/repartoCategorias'
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Comida } from '../../../shared/db/types'
import { todayISO } from '../../../shared/lib/dates'
import * as foodsRepo from '../data/foodsRepo'
import type { AlimentoElegible } from '../lib/alimentos'
import { IconButton } from '../../../shared/components/Button'
import { SearchInput } from '../../../shared/components/Input'
import SectionHeader from '../../../shared/components/SectionHeader'
import ListaElegibles from './ListaElegibles'
import ResultadosBusqueda from './ResultadosBusqueda'
import { EmptyState, LoadingState } from '../../../shared/components/StateMessage'

interface Props {
  comida: Comida
  onElegir: (alimento: AlimentoElegible) => void
  /** Abre el escáner de códigos de barras. */
  onEscanear?: () => void
}

const EN_LA_COMIDA: Record<Comida, string> = {
  desayuno: 'el desayuno',
  comida: 'la comida',
  cena: 'la cena',
  snack: 'el snack',
}

/**
 * Añadido rápido sin IA (funciona sin conexión): buscador y listas de selección. Sin búsqueda muestra lo que más
 * usas en esa comida (tuyo o del catálogo); con búsqueda, primero tus alimentos y después el catálogo.
 */
export default function AlimentosRapidos({ comida, onElegir, onEscanear }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState<FiltroCategoria>('todas')
  const hoy = todayISO()
  const frecuentes = useLiveQuery(() => foodsRepo.frecuentes({ comida, hoy }), [comida, hoy])

  if (frecuentes === undefined) return <LoadingState>Cargando alimentos…</LoadingState>

  // Los del catálogo que ya usas: en el ranking de la búsqueda, a igualdad de coincidencia, van primero.
  const frecuentesFiltrados = filtrarPorCategoria(frecuentes, categoria)
  const idsCatalogo = frecuentes.flatMap((a) => (a.ref.tipo === 'catalog' ? [a.ref.id] : []))

  return (
    <section aria-label="Buscar alimentos" className="space-y-stack">
      <div className="flex items-center gap-2">
        <SearchInput
          tone="surface"
          aria-label="Buscar en tus alimentos y en el catálogo"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar alimento…"
          className="flex-1"
        />
        {onEscanear && <IconButton icon="barcode" label="Escanear código de barras" onClick={onEscanear} />}
      </div>

      <FiltroCategoriaBusqueda valor={categoria} onChange={setCategoria} />

      {busqueda.trim() === '' && frecuentesFiltrados.length > 0 && (
        <div className="space-y-1">
          <SectionHeader variant="section">Frecuentes en {EN_LA_COMIDA[comida]}</SectionHeader>
          <ListaElegibles alimentos={frecuentesFiltrados} onElegir={onElegir} />
        </div>
      )}

      <ResultadosBusqueda categoria={categoria} busqueda={busqueda} onElegir={onElegir} frecuentes={idsCatalogo} />
      {!busqueda.trim() && frecuentesFiltrados.length === 0 && <EmptyState title={categoria === 'todas' ? 'Busca tu primer alimento' : 'Sin frecuentes en esta categoría'} icon="search">{categoria === 'todas' ? 'Escribe su nombre. Los alimentos que uses aparecerán aquí para añadirlos más rápido.' : 'Escribe un nombre para buscar en tus alimentos y el catálogo, o elige otra categoría.'}</EmptyState>}
    </section>
  )
}
