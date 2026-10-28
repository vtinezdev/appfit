import Button from '../../../shared/components/Button'
import Icon, { type IconName } from '../../../shared/components/Icon'
import Sheet from '../../../shared/components/Sheet'
import { CATEGORIAS_ALIMENTO } from '../lib/catalogo/categorias'
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

/**
 * «Filtrar» de Buscar: el orden de los resultados y la categoría, como botones en una hoja; «Quitar filtros» vuelve a
 * Relevancia y Todas, y «Ver resultados» la cierra.
 */
export default function FiltrosBusquedaSheet({ open, onClose, orden, onOrden, categoria, onCategoria }: {
  open: boolean; onClose: () => void; orden: OrdenBusqueda; onOrden: (o: OrdenBusqueda) => void; categoria: FiltroCategoria; onCategoria: (c: FiltroCategoria) => void
}) {
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
          {CATEGORIAS.map((c) => <Chip key={c.valor} activa={c.valor === categoria} onClick={() => onCategoria(c.valor)} icono={c.valor === 'todas' ? 'secciones' : iconoDeCategoria(c.label)}>{c.label}</Chip>)}
        </div>
      </section>
    </div>
  </Sheet>
}
