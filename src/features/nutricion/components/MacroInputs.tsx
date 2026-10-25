import { coherenciaEnergetica, type Por100 } from '../lib/alimentos'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import { formatInt } from '../../../shared/lib/format'
import { useState, type FocusEvent } from 'react'
import { DecimalInput } from '../../../shared/components/Input'
import { NUTRIENTES_ADICIONALES } from '../lib/nutrientes'
interface Props {
  valores: Por100
  onChange: (patch: Partial<Por100>) => void
  detallado?: boolean
  /** Avisa si las kcal no cuadran con los macros y ofrece calcularlas (solo alimentos propios o valores editados). */
  coherencia?: boolean
}
const CAMPOS: { key: Exclude<keyof Por100, 'nutrientes'>; label: string; aria: string }[] = [
  { key: 'kcal100', label: 'Calorías', aria: 'Kcal/100g' },
  { key: 'prot100', label: 'Proteína (g)', aria: 'Prot/100g' },
  { key: 'carb100', label: 'Carbohidratos (g)', aria: 'Carb/100g' },
  { key: 'grasa100', label: 'Grasa (g)', aria: 'Grasa/100g' },
]
/** Un formulario nutricional común, legible incluso en móviles de 320 px. */
export default function MacroInputs({ valores, onChange, detallado = false, coherencia = false }: Props) {
  // El aviso no se enseña con un campo enfocado (aparecería y desaparecería al teclear): sale al salir de él.
  const [escribiendo, setEscribiendo] = useState(false)
  const incoherente = coherencia && !escribiendo ? coherenciaEnergetica(valores) : null
  return (
    <fieldset className="min-w-0"
      onFocus={(e: FocusEvent) => { if (e.target instanceof HTMLInputElement) setEscribiendo(true) }}
      onBlur={(e: FocusEvent) => { if (e.target instanceof HTMLInputElement) setEscribiendo(false) }}>
      <legend className="mb-2 text-label text-fg-muted">Valores por 100 g</legend>
      <div className="grid grid-cols-2 gap-3">
        {CAMPOS.map(({ key, label, aria }) => (
          <label key={key} className="block min-w-0 space-y-1">
            <span className="block text-label text-fg-muted">{label}</span>
            <DecimalInput aria-label={aria} className="tabular" value={valores[key]} onChange={(n) => onChange({ [key]: n ?? 0 })} />
          </label>
        ))}
      </div>
      {incoherente && (
        <div role="status" className="mt-3 space-y-2">
          <p className="flex items-start gap-2 text-body-sm text-warning">
            <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
            <span className="min-w-0">Con estos macros salen unas {formatInt(incoherente.esperadas)} kcal, no {formatInt(valores.kcal100)}. Revisa la etiqueta: el redondeo o la fibra no explican tanta diferencia (el alcohol, sí).</span>
          </p>
          <Button variant="secondary" size="sm" onClick={() => onChange({ kcal100: incoherente.esperadas })}>Calcular kcal desde los macros</Button>
        </div>
      )}
      {detallado && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {NUTRIENTES_ADICIONALES.map(({ clave, label }) => (
            <label key={clave} className="block min-w-0 space-y-1">
              <span className="block text-label text-fg-muted">{label} (g)</span>
              <DecimalInput aria-label={`${label}/100g`} className="tabular" placeholder="Sin datos" value={valores.nutrientes?.[clave]}
                onChange={(n) => {
                  const nutrientes = { ...valores.nutrientes }
                  if (n === undefined) delete nutrientes[clave]
                  else nutrientes[clave] = n
                  onChange({ nutrientes: Object.keys(nutrientes).length ? nutrientes : undefined })
                }} />
            </label>
          ))}
        </div>
      )}
      {detallado && <p className="mt-2 text-caption text-fg-muted">Deja vacío lo desconocido. El valor 0 indica que el alimento no lo contiene.</p>}
    </fieldset>
  )
}
