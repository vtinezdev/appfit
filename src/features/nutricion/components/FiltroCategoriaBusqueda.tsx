import { Select } from '../../../shared/components/Input'
import { CATEGORIAS_ALIMENTO } from '../lib/catalogo/categorias'
import type { FiltroCategoria } from '../lib/repartoCategorias'

export default function FiltroCategoriaBusqueda({ valor, onChange }: { valor: FiltroCategoria; onChange: (valor: FiltroCategoria) => void }) {
  return <label className="block space-y-1">
    <span className="text-label text-fg-muted">Filtrar alimentos por categoría</span>
    <Select aria-label="Filtrar alimentos por categoría" value={valor} onChange={e => onChange(e.target.value as FiltroCategoria)}>
      <option value="todas">Todas las categorías</option>
      {CATEGORIAS_ALIMENTO.map(c => <option key={c} value={c}>{c}</option>)}
      <option value="sin">Sin categoría</option>
    </Select>
  </label>
}
