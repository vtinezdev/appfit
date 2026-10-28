import Icon from '../../../shared/components/Icon'
import ListRow from '../../../shared/components/ListRow'
import { formatInt } from '../../../shared/lib/format'
import { iconoDeCategoria } from '../lib/iconosCategoria'
import DatosReceta from './DatosReceta'
import { PastillasMacros } from './PiezasCantidad'

interface Props {
  nombre: string
  categoria?: string
  /** Lo que aporta una ración (o 100 g si la receta no tiene raciones). */
  aporte: { kcal: number; prot: number; carb: number; grasa: number }
  porRacion: boolean
  raciones?: number
  tiempoMin?: number
  /** Solo sin raciones: el peso cocinado dice entonces cuánto sale. */
  pesoG?: number
  onClick: () => void
}

/**
 * Una receta en una lista (tuyas o del recetario): el icono de su categoría, el nombre con las kcal a la derecha,
 * raciones y tiempo y, debajo, los macros como en Buscar.
 */
export default function FilaReceta({ nombre, categoria, aporte, porRacion, raciones, tiempoMin, pesoG, onClick }: Props) {
  return (
    <ListRow onClick={onClick}>
      <span aria-hidden className="icono-pastilla shrink-0 self-start text-fg-muted"><Icon name={iconoDeCategoria(categoria) ?? 'recetario'} size={18} /></span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0 break-words text-body font-semibold text-fg">{nombre}</span>
          <span className="tabular shrink-0 text-right text-fg"><span className="text-body font-semibold">{formatInt(aporte.kcal)}</span> <span className="text-caption text-fg-muted">{porRacion ? 'kcal/rac.' : 'kcal/100 g'}</span></span>
        </span>
        <DatosReceta raciones={raciones} tiempoMin={tiempoMin} pesoG={pesoG} />
        <span className="mt-2 block"><PastillasMacros macros={aporte} /></span>
      </span>
    </ListRow>
  )
}
