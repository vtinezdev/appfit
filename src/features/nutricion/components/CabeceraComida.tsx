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

/** Cabecera integrada en la tarjeta, con un fondo suave y el total de la comida. */
export default function CabeceraComida({ comida, titulo, kcal, registros, onAcciones }: Props) {
  const valor = formatInt(kcal)
  return <header className="meal-header" data-wide-energy={valor.length > 4 || undefined}>
    <div className="meal-header-grid">
      <span className="meal-header-icon flex h-touch w-touch items-center justify-center text-fg-muted" aria-hidden>
        <span className="icono-pastilla"><Icon name={ICONOS[comida]} size={20} /></span>
      </span>
      <h2 className="meal-header-title min-w-0 break-words text-heading font-extrabold text-fg">{titulo}</h2>
      <p className="sr-only">
        {registros === 0 ? 'Sin registros' : `${formatInt(registros)} ${registros === 1 ? 'registro' : 'registros'}`}
      </p>
      {registros > 0 && <p className="meal-header-energy min-w-0 text-right text-fg">
        <span className="tabular font-numeric break-words text-heading">{valor}</span>
        <span className="text-caption text-fg-muted">kcal</span>
      </p>}
      <IconButton icon="more" label={`Acciones de ${titulo}`} variant="ghost" size="sm" className="meal-header-actions" onClick={onAcciones} />
    </div>
  </header>
}
