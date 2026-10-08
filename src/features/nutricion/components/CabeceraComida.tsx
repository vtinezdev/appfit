import type { Comida } from '../../../shared/db/types'
import { formatInt } from '../../../shared/lib/format'
import { IconButton } from '../../../shared/components/Button'
import Icon, { type IconName } from '../../../shared/components/Icon'

const ICONOS: Record<Comida, IconName> = {
  desayuno: 'sunrise', comida: 'utensils', cena: 'moon', snack: 'zap',
}

interface Props {
  comida: Comida
  titulo: string
  kcal: number
  registros: number
  onAcciones: () => void
}

/** Título de sección sobre la página, sin caja: el color queda para la acción y el total del día. No es un botón. */
export default function CabeceraComida({ comida, titulo, kcal, registros, onAcciones }: Props) {
  const valor = formatInt(kcal)
  return <header className="meal-header" data-wide-energy={valor.length > 4 || undefined}>
    <div className="meal-header-grid">
      <span className="meal-header-icon flex h-touch w-8 items-center justify-start text-fg-subtle" aria-hidden>
        <Icon name={ICONOS[comida]} size={22} />
      </span>
      <h2 className="meal-header-title min-w-0 break-words text-heading font-extrabold text-fg">{titulo}</h2>
      <p className="meal-header-meta min-w-0 text-caption text-fg-muted">
        {registros === 0 ? 'Sin registros' : `${formatInt(registros)} ${registros === 1 ? 'registro' : 'registros'}`}
      </p>
      <p className="meal-header-energy min-w-0 text-right text-fg">
        <span className="tabular break-words text-title font-semibold">{valor}</span>
        <span className="text-caption text-fg-muted">kcal</span>
      </p>
      <IconButton icon="more" label={`Acciones de ${titulo}`} variant="ghost" size="sm" className="meal-header-actions" onClick={onAcciones} />
    </div>
  </header>
}
