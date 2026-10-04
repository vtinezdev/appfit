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

/** Cabecera de sección, separada del plato y sus ingredientes. No es un botón. */
export default function CabeceraComida({ comida, titulo, kcal, registros, onAcciones }: Props) {
  const valor = formatInt(kcal)
  return <header data-surface="meal-header" className="meal-header" data-wide-energy={valor.length > 4 || undefined}>
    <div className="meal-header-grid">
      <span className="meal-header-icon flex h-touch w-touch items-center justify-center rounded-pill border border-accent-strong/30 bg-accent-strong/10 text-accent-strong" aria-hidden>
        <Icon name={ICONOS[comida]} size={24} />
      </span>
      <h2 className="meal-header-title min-w-0 break-words text-heading font-extrabold text-fg">{titulo}</h2>
      <p className="meal-header-meta min-w-0 text-caption text-fg-muted">
        {registros === 0 ? 'Sin registros' : `${formatInt(registros)} ${registros === 1 ? 'registro' : 'registros'}`}
      </p>
      <p className="meal-header-energy min-w-0 text-right text-accent-strong">
        <span className="tabular block break-words text-heading font-extrabold">{valor}</span>
        <span className="block text-caption font-semibold">kcal</span>
      </p>
      <IconButton icon="more" label={`Acciones de ${titulo}`} variant="ghost" size="sm" className="meal-header-actions" onClick={onAcciones} />
    </div>
  </header>
}
