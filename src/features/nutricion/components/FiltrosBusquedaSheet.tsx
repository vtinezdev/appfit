import Button from '../../../shared/components/Button'
import Icon, { type IconName } from '../../../shared/components/Icon'
import Sheet from '../../../shared/components/Sheet'
import { formatInt } from '../../../shared/lib/format'
import { CATEGORIAS_ALIMENTO, type CategoriaAlimento } from '../lib/catalogo/categorias'
import { iconoDeCategoria } from '../lib/iconosCategoria'
import { ORDENES_BUSQUEDA, type OrdenBusqueda } from '../lib/ordenBusqueda'
import type { FiltroCategoria } from '../lib/repartoCategorias'

const CATEGORIAS: { valor: FiltroCategoria; label: string }[] = [
  { valor: 'todas', label: 'Todas' },
  ...CATEGORIAS_ALIMENTO.map((c) => ({ valor: c as FiltroCategoria, label: c })),
  { valor: 'sin', label: 'Sin categoría' },
]

function Chip({ activa, onClick, icono, children }: { activa: boolean; onClick: () => void; icono?: IconName; children: string }) {
  return <button type="button" role="radio" aria-checked={activa} onClick={onClick}
    className={`app-button flex min-h-touch items-center gap-1.5 rounded-pill border px-3 text-body-sm ${activa ? 'border-transparent bg-fg font-semibold text-bg' : 'border-line bg-surface text-fg-muted'}`}>
    {icono && <Icon name={icono} size={16} />}{children}
  </button>
}

const PASTILLA = 'app-button flex min-h-touch items-center gap-1.5 rounded-pill bg-selected px-3 text-body-sm font-semibold text-selected-on'

/** Cuántos filtros hay puestos (el orden y la categoría), para el botón «Filtrar · N». */
export function filtrosActivos(orden: OrdenBusqueda, categoria: FiltroCategoria): number {
  return (orden !== 'relevancia' ? 1 : 0) + (categoria !== 'todas' ? 1 : 0)
}

/** El botón «Filtrar» que va junto al buscador, con cuántos filtros hay puestos. */
export function BotonFiltrar({ activos, onClick }: { activos: number; onClick: () => void }) {
  return <Button variant="secondary" className="shrink-0" aria-haspopup="dialog" onClick={onClick}><Icon name="filtro" size={18} />{activos > 0 ? `Filtrar · ${formatInt(activos)}` : 'Filtrar'}</Button>
}

/** Lo puesto en «Filtrar», como pastillas que se quitan al tocarlas; nada si no hay filtros. */
export function FiltrosActivos({ orden, onOrden, categoria, onCategoria }: {
  orden: OrdenBusqueda; onOrden: (o: OrdenBusqueda) => void; categoria: FiltroCategoria; onCategoria: (c: FiltroCategoria) => void
}) {
  if (filtrosActivos(orden, categoria) === 0) return null
  const nombreCategoria = categoria === 'sin' ? 'Sin categoría' : categoria
  const nombreOrden = ORDENES_BUSQUEDA.find((o) => o.valor === orden)!.label
  return <ul className="flex flex-wrap gap-2" aria-label="Filtros activos">
    {categoria !== 'todas' && <li><button type="button" aria-label={`Quitar el filtro ${nombreCategoria}`} onClick={() => onCategoria('todas')} className={PASTILLA}>{nombreCategoria}<Icon name="close" size={14} /></button></li>}
    {orden !== 'relevancia' && <li><button type="button" aria-label={`Quitar el orden ${nombreOrden}`} onClick={() => onOrden('relevancia')} className={PASTILLA}><Icon name="ordenar" size={14} />{nombreOrden}<Icon name="close" size={14} /></button></li>}
  </ul>
}

/**
 * «Filtrar» de Buscar y del recetario: el orden de los resultados y la categoría, como botones en una hoja; «Quitar
 * filtros» vuelve a Relevancia y Todas, y «Ver resultados» la cierra. Con `categorias`, solo ofrece esas (las que hay).
 */
export default function FiltrosBusquedaSheet({ open, onClose, orden, onOrden, categoria, onCategoria, categorias }: {
  open: boolean; onClose: () => void; orden: OrdenBusqueda; onOrden: (o: OrdenBusqueda) => void; categoria: FiltroCategoria; onCategoria: (c: FiltroCategoria) => void
  categorias?: readonly CategoriaAlimento[]
}) {
  const opciones = categorias ? [CATEGORIAS[0], ...categorias.map((c) => ({ valor: c as FiltroCategoria, label: c }))] : CATEGORIAS
  return <Sheet open={open} onClose={onClose} title="Filtrar y ordenar"
    footer={<div className="flex gap-2">
      <Button variant="ghost" onClick={() => { onOrden('relevancia'); onCategoria('todas') }}>Quitar filtros</Button>
      <Button block onClick={onClose}>Ver resultados</Button>
    </div>}>
    <div className="space-y-section">
      <section aria-labelledby="filtro-orden" className="space-y-2">
        <h3 id="filtro-orden" className="text-rotulo text-fg-muted">Ordenar por</h3>
        <div role="radiogroup" aria-labelledby="filtro-orden" className="flex flex-wrap gap-2">
          {ORDENES_BUSQUEDA.map((o) => <Chip key={o.valor} activa={o.valor === orden} onClick={() => onOrden(o.valor)}>{o.label}</Chip>)}
        </div>
      </section>
      <section aria-labelledby="filtro-categoria" className="space-y-2">
        <h3 id="filtro-categoria" className="text-rotulo text-fg-muted">Categoría</h3>
        <div role="radiogroup" aria-labelledby="filtro-categoria" className="flex flex-wrap gap-2">
          {opciones.map((c) => <Chip key={c.valor} activa={c.valor === categoria} onClick={() => onCategoria(c.valor)} icono={c.valor === 'todas' ? 'secciones' : iconoDeCategoria(c.label)}>{c.label}</Chip>)}
        </div>
      </section>
    </div>
  </Sheet>
}
