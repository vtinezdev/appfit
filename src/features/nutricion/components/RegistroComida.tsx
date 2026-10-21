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
  /** Icono de categoría fuera del botón principal; los platos llevan su propio icono dentro. */
  icono?: ReactNode
  children?: ReactNode
}

/** Nombre, cantidad y kcal en una fila; los macros se reúnen una sola vez al pie de la comida. */
export default function RegistroComida({ tipo, nombre, nombreOriginal, detalle, macros, aproximado, onClick, abierto, detalleId, accion, icono, children }: Props) {
  const kcal = formatInt(macros.kcal)
  const plato = tipo === 'plato'
  // Filas planas dentro de la superficie de la comida: el agrupamiento lo da la comida, no una caja por registro.
  return <div data-registro={tipo} className="food-record min-w-0">
    <div className="flex items-center gap-1 px-2 py-1">
      {!plato && icono}
      <button type="button" onClick={onClick} aria-expanded={abierto} aria-controls={detalleId}
        className={`food-record-button ${plato ? 'food-record-plato' : ''} min-h-touch min-w-0 flex-1 rounded-sm px-1 py-2 text-left transition-colors duration-short hover:bg-surface-muted active:bg-surface-muted`}>
        {plato && <span aria-hidden className="food-record-icon grid h-touch w-touch place-items-center text-fg-muted"><Icon name="cat-plato" size={20} /></span>}
        <span className="food-record-name flex min-w-0 items-start gap-1">
          <span data-record-name className={`min-w-0 break-words text-body-sm text-fg ${tipo === 'ingrediente' ? 'font-medium' : 'font-semibold'}`} title={nombreOriginal ?? nombre}>{nombre}</span>
        </span>
        <span className="food-record-detail tabular flex min-w-0 flex-wrap items-baseline gap-x-1 text-caption text-fg-muted">
          <span data-record-quantity className="min-w-0 break-words">{detalle}</span>
        </span>
        <span className="food-record-energy flex min-w-0 flex-col items-end text-right text-fg">
          <span data-record-kcal className="tabular min-w-0 break-words text-body-sm font-semibold">{aproximado ? '≈ ' : ''}{kcal}</span>
          <span className="text-caption text-fg-muted">kcal</span>
        </span>
        <Icon name="chevron-right" size={18} className={`food-record-chevron shrink-0 text-fg-subtle transition-transform duration-short ${plato && abierto ? 'rotate-90' : ''}`} />
      </button>
      {accion}
    </div>
    {children}
  </div>
}
