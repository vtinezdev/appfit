import { filtrarPorCategoria, type FiltroCategoria } from '../lib/repartoCategorias'
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Comida } from '../../../shared/db/types'
import { todayISO } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import * as foodsRepo from '../data/foodsRepo'
import * as recetasRepo from '../data/recetasRepo'
import { marcarRecetasPropias } from '../lib/recetas'
import type { AlimentoElegible } from '../lib/alimentos'
import { IconButton } from '../../../shared/components/Button'
import { SearchInput } from '../../../shared/components/Input'
import ListaElegibles from './ListaElegibles'
import FiltrosBusquedaSheet from './FiltrosBusquedaSheet'
import Icon from '../../../shared/components/Icon'
import Button from '../../../shared/components/Button'
import { ORDENES_BUSQUEDA, type OrdenBusqueda } from '../lib/ordenBusqueda'
import ResultadosBusqueda, { TituloResultados } from './ResultadosBusqueda'
import { EmptyState, LoadingState } from '../../../shared/components/StateMessage'

interface Props {
  comida: Comida
  onElegir: (alimento: AlimentoElegible) => void
  /** Abre el escáner de códigos de barras. */
  onEscanear?: () => void
  /** «Créalo tú» cuando no está lo buscado. */
  onCrear?: (nombre: string) => void
}

const PASTILLA = 'app-button flex min-h-touch items-center gap-1.5 rounded-pill bg-selected px-3 text-body-sm font-semibold text-selected-on'

const EN_LA_COMIDA: Record<Comida, string> = {
  desayuno: 'el desayuno',
  comida: 'la comida',
  cena: 'la cena',
  snack: 'el snack',
}

/**
 * Añadido rápido sin IA (funciona sin conexión): buscador con «Filtrar» (orden y categoría en una hoja; lo puesto,
 * como pastillas que se quitan) y listas de selección. Sin búsqueda muestra lo que más usas en esa comida (tuyo o del
 * catálogo); con búsqueda, primero tus alimentos y después el catálogo.
 */
export default function AlimentosRapidos({ comida, onElegir, onEscanear, onCrear }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState<FiltroCategoria>('todas')
  const [orden, setOrden] = useState<OrdenBusqueda>('relevancia')
  const [filtros, setFiltros] = useState(false)
  const activos = (orden !== 'relevancia' ? 1 : 0) + (categoria !== 'todas' ? 1 : 0)
  const nombreCategoria = categoria === 'sin' ? 'Sin categoría' : categoria
  const nombreOrden = ORDENES_BUSQUEDA.find((o) => o.valor === orden)!.label
  const hoy = todayISO()
  const frecuentes = useLiveQuery(async () => {
    const usados = await foodsRepo.frecuentes({ comida, hoy })
    return marcarRecetasPropias(usados, await recetasRepo.porAlimentos(usados.flatMap((a) => (a.ref.tipo === 'user' ? [a.ref.id] : []))))
  }, [comida, hoy])

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
        <Button variant="secondary" className="shrink-0" aria-haspopup="dialog" onClick={() => setFiltros(true)}><Icon name="filtro" size={18} />{activos > 0 ? `Filtrar · ${formatInt(activos)}` : 'Filtrar'}</Button>
      </div>

      {activos > 0 && <ul className="flex flex-wrap gap-2" aria-label="Filtros activos">
        {categoria !== 'todas' && <li><button type="button" aria-label={`Quitar el filtro ${nombreCategoria}`} onClick={() => setCategoria('todas')} className={PASTILLA}>{nombreCategoria}<Icon name="close" size={14} /></button></li>}
        {orden !== 'relevancia' && <li><button type="button" aria-label={`Quitar el orden ${nombreOrden}`} onClick={() => setOrden('relevancia')} className={PASTILLA}><Icon name="ordenar" size={14} />{nombreOrden}<Icon name="close" size={14} /></button></li>}
      </ul>}
      <FiltrosBusquedaSheet open={filtros} onClose={() => setFiltros(false)} orden={orden} onOrden={setOrden} categoria={categoria} onCategoria={setCategoria} />

      {busqueda.trim() === '' && frecuentesFiltrados.length > 0 && (
        <div className="space-y-2">
          <TituloResultados texto={`Frecuentes en ${EN_LA_COMIDA[comida]}`} />
          <ListaElegibles alimentos={frecuentesFiltrados} onElegir={onElegir} />
        </div>
      )}

      <ResultadosBusqueda categoria={categoria} busqueda={busqueda} onElegir={onElegir} frecuentes={idsCatalogo} onCrear={onCrear} orden={orden} />
      {!busqueda.trim() && frecuentesFiltrados.length === 0 && <EmptyState title={categoria === 'todas' ? 'Busca tu primer alimento' : 'Sin frecuentes en esta categoría'} icon="search">{categoria === 'todas' ? 'Escribe su nombre. Los alimentos que uses aparecerán aquí para añadirlos más rápido.' : 'Escribe un nombre para buscar en tus alimentos y el catálogo, o elige otra categoría.'}</EmptyState>}
    </section>
  )
}
