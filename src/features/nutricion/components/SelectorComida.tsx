import type { KeyboardEvent } from 'react'
import type { Comida } from '../../../shared/db/types'
import Icon, { type IconName } from '../../../shared/components/Icon'
import { indicePorTecla } from '../../../shared/design/selection'
import { COMIDAS } from '../lib/comidas'

const ICONO: Record<Comida, IconName> = { desayuno: 'sunrise', comida: 'utensils', cena: 'moon', snack: 'cat-fruta' }

/** La comida del día en cuatro casillas con su icono: se elige de un toque (grupo de radio, flechas para moverse). */
export default function SelectorComida({ valor, onChange }: { valor: Comida; onChange: (c: Comida) => void }) {
  const teclado = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const next = indicePorTecla(e.key, i, COMIDAS.length)
    if (next === null) return
    e.preventDefault()
    onChange(COMIDAS[next].valor)
    ;(e.currentTarget.parentElement?.children[next] as HTMLButtonElement | undefined)?.focus()
  }
  return <div role="radiogroup" aria-label="Comida del día" className="grid grid-cols-4 gap-2">
    {COMIDAS.map((c, i) => {
      const activa = c.valor === valor
      return <button key={c.valor} type="button" role="radio" aria-checked={activa} tabIndex={activa ? 0 : -1}
        onClick={() => onChange(c.valor)} onKeyDown={(e) => teclado(e, i)}
        className={`app-button flex min-h-touch min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-caption font-semibold ${activa ? 'bg-selected text-selected-on' : 'bg-surface-muted text-fg-muted enabled:hover:text-fg'}`}>
        <Icon name={ICONO[c.valor]} size={20} />
        <span className="max-w-full truncate">{c.label}</span>
      </button>
    })}
  </div>
}
