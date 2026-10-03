import type { Por100 } from '../lib/alimentos'
import { Input } from '../../../shared/components/Input'
import { NUTRIENTES_ADICIONALES } from '../lib/nutrientes'
interface Props {
  valores: Por100
  onChange: (patch: Partial<Por100>) => void
  detallado?: boolean
}
const CAMPOS: { key: Exclude<keyof Por100, 'nutrientes'>; label: string; aria: string }[] = [
  { key: 'kcal100', label: 'Calorías', aria: 'Kcal/100g' },
  { key: 'prot100', label: 'Proteína (g)', aria: 'Prot/100g' },
  { key: 'carb100', label: 'Carbohidratos (g)', aria: 'Carb/100g' },
  { key: 'grasa100', label: 'Grasa (g)', aria: 'Grasa/100g' },
]
/** Un formulario nutricional común, legible incluso en móviles de 320 px. */
export default function MacroInputs({ valores, onChange, detallado = false }: Props) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-label text-fg-muted">Valores por 100 g</legend>
      <div className="grid grid-cols-2 gap-3">
        {CAMPOS.map(({ key, label, aria }) => (
          <label key={key} className="block min-w-0 space-y-1">
            <span className="block text-label text-fg-muted">{label}</span>
            <Input type="number" inputMode="decimal" min={0} step="any" aria-label={aria} className="tabular no-spin"
              value={valores[key]} onChange={(e) => onChange({ [key]: Number(e.target.value) || 0 })} />
          </label>
        ))}
        {detallado && NUTRIENTES_ADICIONALES.map(({ clave, label }) => (
          <label key={clave} className="block min-w-0 space-y-1">
            <span className="block text-label text-fg-muted">{label} (g)</span>
            <Input type="number" inputMode="decimal" min={0} step="any" aria-label={`${label}/100g`} className="tabular no-spin"
              placeholder="Sin datos" value={valores.nutrientes?.[clave] ?? ''}
              onChange={(e) => {
                const nutrientes = { ...valores.nutrientes }
                const texto = e.target.value.trim()
                const numero = Number(texto)
                if (!texto) delete nutrientes[clave]
                else if (Number.isFinite(numero) && numero >= 0) nutrientes[clave] = numero
                else return
                onChange({ nutrientes: Object.keys(nutrientes).length ? nutrientes : undefined })
              }} />
          </label>
        ))}
      </div>
      {detallado && <p className="mt-2 text-caption text-fg-muted">Deja vacío lo desconocido. El valor 0 indica que el alimento no lo contiene.</p>}
    </fieldset>
  )
}
