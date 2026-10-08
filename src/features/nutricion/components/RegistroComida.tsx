import type { ReactNode } from 'react'
import Icon from '../../../shared/components/Icon'
import { formatInt } from '../../../shared/lib/format'
import type { Macros } from '../lib/nutrition'

interface Props {
  tipo: 'individual' | 'plato' | 'ingrediente'
  nombre: string
  nombreOriginal?: string
  detalle: string
  macros: Macros
  aproximado?: boolean
  onClick: () => void
  abierto?: boolean
  detalleId?: string
  accion: ReactNode
  /** Columna a la izquierda de la fila (el icono de categoría o su hueco). Va fuera del botón principal. */
  icono?: ReactNode
  children?: ReactNode
}

/** Un registro tiene la misma jerarquía, sea alimento o plato; los ingredientes son filas interiores. */
export default function RegistroComida({ tipo, nombre, nombreOriginal, detalle, macros, aproximado, onClick, abierto, detalleId, accion, icono, children }: Props) {
  const kcal = formatInt(macros.kcal)
  // Filas planas dentro de la superficie de la comida: el agrupamiento lo da la comida, no una caja por registro.
  return <div data-registro={tipo} className="food-record min-w-0">
    <div className="flex items-center gap-1 px-2 py-1">
      {icono}
      <button type="button" onClick={onClick} aria-expanded={abierto} aria-controls={detalleId}
        className="food-record-button min-h-touch min-w-0 flex-1 rounded-sm px-1 py-2 text-left transition-colors duration-short hover:bg-surface-muted active:bg-surface-muted">
        <span className="food-record-name flex min-w-0 items-start gap-1">
          {tipo === 'plato' && <Icon name="chevron-right" size={16} className={`mt-1 text-fg-muted transition-transform duration-short ${abierto ? 'rotate-90' : ''}`} />}
          <span data-record-name className={`min-w-0 break-words text-body text-fg ${tipo === 'ingrediente' ? 'font-medium' : 'font-semibold'}`} title={nombreOriginal ?? nombre}>{nombre}</span>
        </span>
        <span className="food-record-detail tabular flex min-w-0 flex-wrap items-baseline gap-x-1 text-caption text-fg-muted">
          <span data-record-quantity className="min-w-0 break-words">{detalle}</span>
          <span aria-hidden>·</span>
          <span data-record-macros className="min-w-0 break-words">P {formatInt(macros.prot)} · C {formatInt(macros.carb)} · G {formatInt(macros.grasa)}</span>
        </span>
        <span className="food-record-energy flex min-w-0 flex-wrap items-baseline justify-end gap-x-1 text-fg">
          <span data-record-kcal className="tabular min-w-0 break-words text-body font-semibold">{aproximado ? '≈ ' : ''}{kcal}</span>
          <span className="text-caption text-fg-muted">kcal</span>
        </span>
      </button>
      {accion}
    </div>
    {children}
  </div>
}
