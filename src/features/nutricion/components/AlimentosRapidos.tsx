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
  const hoy = todayISO()
  const frecuentes = useLiveQuery(() => foodsRepo.frecuentes({ comida, hoy }), [comida, hoy])

  if (frecuentes === undefined) return <LoadingState>Cargando alimentos…</LoadingState>

  // Los del catálogo que ya usas: en el ranking de la búsqueda, a igualdad de coincidencia, van primero.
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

      {busqueda.trim() === '' && frecuentes.length > 0 && (
        <div className="space-y-1">
          <SectionHeader variant="section">Frecuentes en {EN_LA_COMIDA[comida]}</SectionHeader>
          <ListaElegibles alimentos={frecuentes} onElegir={onElegir} />
        </div>
      )}

      <ResultadosBusqueda busqueda={busqueda} onElegir={onElegir} frecuentes={idsCatalogo} />
      {!busqueda.trim() && frecuentes.length === 0 && <EmptyState title="Busca tu primer alimento" icon="search">Escribe su nombre. Los alimentos que uses aparecerán aquí para añadirlos más rápido.</EmptyState>}
    </section>
  )
}
