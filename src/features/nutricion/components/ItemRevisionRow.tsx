import AnimatedNumber from '../../../shared/components/AnimatedNumber'
import { IconButton } from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import { Input } from '../../../shared/components/Input'
import NumberStepper from '../../../shared/components/NumberStepper'
import type { ItemRevision } from '../lib/alimentos'
import { macrosPorGramos, resumenMacros } from '../lib/nutrition'
import MacroInputs from './MacroInputs'

interface Props {
  item: ItemRevision
  onChange: (patch: Partial<ItemRevision>) => void
  /** Si no se pasa, no se muestra el botón de quitar (p. ej. al editar una entrada). */
  onQuitar?: () => void
  aviso?: string
}

/**
 * Un alimento en la revisión, como fila de una lista (la Card que las agrupa la pone quien las usa).
 * Orden de lectura: nombre → cantidad → lo que aporta (kcal con presencia, P/C/G debajo) → valores por 100 g, todo editable.
 * Las kcal y los macros son los mismos que se guardarán (`macrosPorGramos`).
 */
export default function ItemRevisionRow({ item, onChange, onQuitar, aviso }: Props) {
  const aporte = macrosPorGramos(item, item.gramos)
  const kcal = Math.round(aporte.kcal)
  const sinNombre = !item.nombre.trim()
  return (
    <div className="space-y-3 p-card">
      <div className="flex items-center gap-2">
        <Input
          aria-label="Nombre del alimento"
          aria-invalid={sinNombre}
          placeholder="Nombre del alimento"
          value={item.nombre}
          onChange={(e) => onChange({ nombre: e.target.value })}
          className="truncate font-medium"
        />
        {onQuitar && <IconButton icon="trash" label={`Quitar ${item.nombre || 'alimento'}`} variant="ghost" size="sm" onClick={onQuitar} />}
      </div>

      <div className="flex items-center justify-between gap-3">
        <NumberStepper label="gramos" value={item.gramos} onChange={(v) => onChange({ gramos: v })} step={10} suffix="g" />
        <div className="min-w-0 text-right">
          <p className="flex items-baseline justify-end gap-1 text-fg">
            <AnimatedNumber value={kcal} className="text-title" />
            <span className="text-caption text-fg-subtle">kcal</span>
          </p>
          <p className="tabular truncate text-caption text-fg-subtle">{resumenMacros(aporte)}</p>
        </div>
      </div>

      <MacroInputs layout="row" valores={item} onChange={onChange} />

      {aviso && (
        <p className="flex items-start gap-2 text-caption text-warning">
          <Icon name="alert" size={16} className="mt-px" />
          <span className="min-w-0">{aviso}</span>
        </p>
      )}
    </div>
  )
}
