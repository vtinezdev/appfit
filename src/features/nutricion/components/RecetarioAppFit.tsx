import { useDeferredValue, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button from '../../../shared/components/Button'
import { SearchInput } from '../../../shared/components/Input'
import ListGroup from '../../../shared/components/ListGroup'
import { EmptyState, LoadingState } from '../../../shared/components/StateMessage'
import { formatInt } from '../../../shared/lib/format'
import * as catalogRepo from '../data/catalogRepo'
import type { OrdenBusqueda } from '../lib/ordenBusqueda'
import { filtrarPorCategoria, type FiltroCategoria } from '../lib/repartoCategorias'
import { categoriasRecetario, filtrarRecetario, ordenarRecetario, racionRecetario } from '../lib/variantes'
import FichaReceta from './FichaReceta'
import { TituloResultados } from './ResultadosBusqueda'
import FilaReceta from './FilaReceta'
import FiltrosBusquedaSheet, { BotonFiltrar, FiltrosActivos, filtrosActivos } from './FiltrosBusquedaSheet'

/** Cuántas se enseñan de golpe; «Ver más» añade otras tantas. */
const TANDA = 30

/**
 * Las recetas del catálogo de típicos (solo lectura) con buscador y «Filtrar» (orden por ración y las categorías que
 * hay, como en Buscar). Tocar una abre su ficha. Vienen con el catálogo, así que hasta que se descarga no hay ninguna.
 */
export default function RecetarioAppFit() {
  const platos = useLiveQuery(() => catalogRepo.recetario(), [])
  const [busqueda, setBusqueda] = useState('')
  const consulta = useDeferredValue(busqueda)
  const [categoria, setCategoria] = useState<FiltroCategoria>('todas')
  const [orden, setOrden] = useState<OrdenBusqueda>('relevancia')
  const [filtros, setFiltros] = useState(false)
  const [visibles, setVisibles] = useState(TANDA)
  const [abierta, setAbierta] = useState<string | null>(null)

  if (platos === undefined) return <LoadingState>Cargando el recetario…</LoadingState>
  if (platos.length === 0) return <EmptyState icon="recetario" title="El recetario aún no está descargado">Llega con el catálogo de alimentos: se descarga solo al abrir la app con conexión, o desde Ajustes › Catálogo de alimentos.</EmptyState>

  const encontradas = ordenarRecetario(filtrarPorCategoria(filtrarRecetario(platos, consulta), categoria), orden)
  const cambiarCategoria = (c: FiltroCategoria) => { setCategoria(c); setVisibles(TANDA) }
  const cambiarOrden = (o: OrdenBusqueda) => { setOrden(o); setVisibles(TANDA) }

  return (
    <div className="space-y-stack">
      <div className="flex items-center gap-2">
        <SearchInput tone="surface" aria-label="Buscar en el recetario AppFit" placeholder="Buscar receta…" value={busqueda}
          onChange={(e) => { setBusqueda(e.target.value); setVisibles(TANDA) }} className="flex-1" />
        <BotonFiltrar activos={filtrosActivos(orden, categoria)} onClick={() => setFiltros(true)} />
      </div>
      <FiltrosActivos orden={orden} onOrden={cambiarOrden} categoria={categoria} onCategoria={cambiarCategoria} />
      {encontradas.length === 0
        ? <EmptyState>{consulta.trim() ? 'Ninguna receta del recetario se llama así.' : 'Ninguna receta del recetario es de esta categoría.'}</EmptyState>
        : <>
          {/* Cuántas hay con lo buscado y lo filtrado, como «Tus alimentos 3» en Buscar. */}
          <TituloResultados texto="Recetas" n={encontradas.length} />
          <ListGroup aria-label="Recetario AppFit">
            {encontradas.slice(0, visibles).map((p) => {
              const r = p.receta!
              const { porRacion, ...aporte } = racionRecetario(p)
              return <li key={p.id}><FilaReceta nombre={p.nombre} categoria={p.categoria} aporte={aporte} porRacion={porRacion} raciones={r.raciones} tiempoMin={r.tiempoMin} onClick={() => setAbierta(p.id)} /></li>
            })}
          </ListGroup>
        </>}
      {encontradas.length > visibles && (
        <Button variant="secondary" block onClick={() => setVisibles(visibles + TANDA)}>Ver más ({formatInt(encontradas.length - visibles)})</Button>
      )}
      <FiltrosBusquedaSheet open={filtros} onClose={() => setFiltros(false)} orden={orden} onOrden={cambiarOrden} categoria={categoria} onCategoria={cambiarCategoria}
        categorias={categoriasRecetario(platos)} />
      {abierta !== null && <FichaReceta key={abierta} catalogId={abierta} onClose={() => setAbierta(null)} />}
    </div>
  )
}
