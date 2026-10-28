import type { KeyboardEvent } from 'react'
import Icon from '../../../shared/components/Icon'
import { indicePorTecla } from '../../../shared/design/selection'
import { CATEGORIAS_ALIMENTO } from '../lib/catalogo/categorias'
import { iconoDeCategoria } from '../lib/iconosCategoria'
import type { FiltroCategoria } from '../lib/repartoCategorias'

const OPCIONES: { valor: FiltroCategoria; label: string }[] = [
  { valor: 'todas', label: 'Todas' },
  ...CATEGORIAS_ALIMENTO.map((c) => ({ valor: c as FiltroCategoria, label: c })),
  { valor: 'sin', label: 'Sin categoría' },
]

/** Categorías como botones con su icono en una fila que se desliza (grupo de radio, flechas para moverse). */
export default function FiltroCategoriaBusqueda({ valor, onChange }: { valor: FiltroCategoria; onChange: (valor: FiltroCategoria) => void }) {
  const teclado = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const next = indicePorTecla(e.key, i, OPCIONES.length)
    if (next === null) return
    e.preventDefault()
    onChange(OPCIONES[next].valor)
    ;(e.currentTarget.parentElement?.children[next] as HTMLButtonElement | undefined)?.focus()
  }
  return <div role="radiogroup" aria-label="Filtrar alimentos por categoría" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
    {OPCIONES.map((o, i) => {
      const activa = o.valor === valor
      const icono = o.valor === 'todas' ? 'secciones' : iconoDeCategoria(o.label)
      return <button key={o.valor} type="button" role="radio" aria-checked={activa} tabIndex={activa ? 0 : -1}
        onClick={() => onChange(o.valor)} onKeyDown={(e) => teclado(e, i)}
        className={`app-button flex min-h-touch shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill border px-3 text-body-sm ${activa ? 'border-transparent bg-selected font-semibold text-selected-on' : 'border-line bg-surface text-fg-muted'}`}>
        {icono && <Icon name={icono} size={16} />}{o.label}
      </button>
    })}
  </div>
}
