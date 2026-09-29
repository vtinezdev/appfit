import type { Por100 } from '../lib/alimentos'
import { Input } from '../../../shared/components/Input'

interface Props {
  valores: Por100
  onChange: (patch: Partial<Por100>) => void
  /** `grid` (2×2, etiqueta al lado; en el editor de alimentos) o `row` (4 columnas, etiqueta encima; en la revisión, a 375 px). */
  layout?: 'grid' | 'row'
  /** Solo en `grid`: tamaño y color del texto de las etiquetas (los inputs siempre van a 16 px por el CSS global). */
  className?: string
}

const CAMPOS: { key: keyof Por100; label: string; corta: string }[] = [
  { key: 'kcal100', label: 'Kcal/100g', corta: 'Kcal' },
  { key: 'prot100', label: 'Prot/100g', corta: 'Prot.' },
  { key: 'carb100', label: 'Carb/100g', corta: 'Carb.' },
  { key: 'grasa100', label: 'Grasa/100g', corta: 'Grasa' },
]

/** Los 4 valores nutricionales por 100 g de un alimento. */
export default function MacroInputs({ valores, onChange, layout = 'grid', className = 'text-caption text-fg-muted' }: Props) {
  if (layout === 'row') {
    return (
      <fieldset className="min-w-0">
        <legend className="mb-1 text-caption text-fg-subtle">Por 100 g</legend>
        <div className="grid grid-cols-4 gap-2">
          {CAMPOS.map(({ key, label, corta }) => (
            <label key={key} className="block min-w-0">
              <span className="mb-1 block truncate text-caption text-fg-subtle">{corta}</span>
              <Input
                type="number"
                inputMode="decimal"
                aria-label={label}
                className="no-spin text-center"
                value={valores[key]}
                onChange={(e) => onChange({ [key]: Number(e.target.value) || 0 })}
              />
            </label>
          ))}
        </div>
      </fieldset>
    )
  }
  return (
    <div className={`grid grid-cols-2 gap-2 ${className}`}>
      {CAMPOS.map(({ key, label }) => (
        <label key={key} className="flex items-center gap-1">
          {label}
          <Input
            dense
            type="number"
            inputMode="decimal"
            value={valores[key]}
            onChange={(e) => onChange({ [key]: Number(e.target.value) || 0 })}
          />
        </label>
      ))}
    </div>
  )
}
