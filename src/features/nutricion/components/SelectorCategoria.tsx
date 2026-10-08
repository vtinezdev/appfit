import { Select } from '../../../shared/components/Input'
import { CATEGORIAS_ALIMENTO, esCategoriaAlimento, type CategoriaAlimento } from '../lib/catalogo/categorias'

interface Props {
  valor: string | undefined
  onChange: (categoria: CategoriaAlimento) => void
  /** `surface` cuando va directamente sobre el fondo de pantalla. */
  tone?: 'muted' | 'surface'
}

/** Categoría obligatoria de un alimento propio: hasta elegir una, el campo queda marcado como incompleto. */
export default function SelectorCategoria({ valor, onChange, tone }: Props) {
  const elegida = esCategoriaAlimento(valor) ? valor : ''
  return (
    <label className="block space-y-1">
      <span className="block text-label text-fg-muted">Categoría</span>
      <Select tone={tone} value={elegida} aria-invalid={elegida === ''} onChange={(e) => { if (esCategoriaAlimento(e.target.value)) onChange(e.target.value) }}>
        <option value="" disabled>Elige una categoría</option>
        {CATEGORIAS_ALIMENTO.map((c) => <option key={c} value={c}>{c}</option>)}
      </Select>
    </label>
  )
}
