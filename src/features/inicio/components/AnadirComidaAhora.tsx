import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import type { Comida } from '../../../shared/db/types'
import { comidaPorHora } from '../../../shared/lib/dates'

const NOMBRE: Record<Comida, string> = { desayuno: 'desayuno', comida: 'comida', cena: 'cena', snack: 'snack' }

/**
 * Pie de la tarjeta de energía: «Añadir desayuno» (la comida según la hora, `comidaPorHora`), que abre Añadir comida en
 * Nutrición ya en esa comida. Neutro, sin acento: la tarjeta sigue siendo un resumen. `ahora` solo para los tests.
 */
export default function AnadirComidaAhora({ onAnadir, onCalcularObjetivo, ahora }: {
  onAnadir: (comida: Comida) => void
  /** Sin objetivo (ADR 066): «Calcular mi objetivo» encima, que abre Perfil. */
  onCalcularObjetivo?: () => void
  ahora?: Date
}) {
  const comida = comidaPorHora(ahora)
  return (
    <div className="space-y-2 border-t border-line px-4 py-3">
      {onCalcularObjetivo && <Button variant="ghost" size="sm" block onClick={onCalcularObjetivo}>Calcular mi objetivo<Icon name="chevron-right" size={16} /></Button>}
      <Button variant="secondary" size="sm" block onClick={() => onAnadir(comida)}><Icon name="plus" size={18} />Añadir {NOMBRE[comida]}</Button>
    </div>
  )
}
