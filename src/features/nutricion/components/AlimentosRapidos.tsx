import FiltroCategoriaBusqueda from './FiltroCategoriaBusqueda'
import { filtrarPorCategoria, type FiltroCategoria } from '../lib/repartoCategorias'
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Comida } from '../../../shared/db/types'
import { todayISO } from '../../../shared/lib/dates'
import * as foodsRepo from '../data/foodsRepo'
import { encajanConLoQueFalta, type AlimentoElegible } from '../lib/alimentos'
import Button, { IconButton } from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import ListRow from '../../../shared/components/ListRow'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { claveRef } from '../../../shared/db/foodRef'
import { SearchInput } from '../../../shared/components/Input'
import SectionHeader from '../../../shared/components/SectionHeader'
import ListaElegibles from './ListaElegibles'
import ResultadosBusqueda from './ResultadosBusqueda'
import { EmptyState, LoadingState } from '../../../shared/components/StateMessage'

interface Props {
  comida: Comida
  /** Elegir un alimento; con `gramos`, la cantidad propuesta (B10), editable en la hoja de gramos. */
  onElegir: (alimento: AlimentoElegible, gramos?: number) => void
  /** Lo que falta del día (proteína y kcal) para «Encajan con lo que te falta» (B10); `null` sin objetivo. */
  falta?: { prot: number; kcal: number } | null
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
export default function AlimentosRapidos({ comida, onElegir, onEscanear, falta = null }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [encajan, setEncajan] = useState(false)
  const [categoria, setCategoria] = useState<FiltroCategoria>('todas')
  const hoy = todayISO()
  const frecuentes = useLiveQuery(() => foodsRepo.frecuentes({ comida, hoy }), [comida, hoy])

  if (frecuentes === undefined) return <LoadingState>Cargando alimentos…</LoadingState>

  // Los del catálogo que ya usas: en el ranking de la búsqueda, a igualdad de coincidencia, van primero.
  const frecuentesFiltrados = filtrarPorCategoria(frecuentes, categoria)
  const idsCatalogo = frecuentes.flatMap((a) => (a.ref.tipo === 'catalog' ? [a.ref.id] : []))
  // «Cerrar el día» (B10): solo si falta proteína (10 g o más), quedan kcal y algún habitual encaja.
  const encajes = falta ? encajanConLoQueFalta(frecuentes, falta) : []
  const conEncajes = encajan && encajes.length > 0 && busqueda.trim() === ''

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

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1 basis-48"><FiltroCategoriaBusqueda valor={categoria} onChange={setCategoria} /></div>
        {encajes.length > 0 && <Button variant={encajan ? 'primary' : 'secondary'} size="sm" aria-pressed={encajan} onClick={() => setEncajan((v) => !v)}>
          <Icon name="flag" size={16} />Encajan con lo que te falta
        </Button>}
      </div>

      {conEncajes && falta && <div className="space-y-1">
        <SectionHeader variant="section">Encajan con lo que te falta</SectionHeader>
        <p className="tabular text-body-sm text-fg-muted">Te faltan {formatInt(falta.prot)} g de proteína y quedan {formatInt(falta.kcal)} kcal. Tus habituales, con la cantidad que más se acerca sin pasarte de las kcal.</p>
        <ul className="divide-y divide-line" aria-label="Alimentos que encajan">
          {encajes.map((e) => <li key={claveRef(e.alimento.ref)}>
            <ListRow tone="flat" onClick={() => onElegir(e.alimento, e.gramos)}>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-body font-medium">{e.alimento.nombre}</span>
                <span className="tabular mt-1 block text-caption text-fg-muted">{formatInt(e.gramos)} {e.alimento.ml ? 'ml' : 'g'} · {formatNumber(e.prot, 0)} g de proteína · {formatInt(e.kcal)} kcal</span>
              </span>
              <Icon name="chevron-right" size={18} className="shrink-0 text-fg-subtle" />
            </ListRow>
          </li>)}
        </ul>
      </div>}

      {!conEncajes && busqueda.trim() === '' && frecuentesFiltrados.length > 0 && (
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
