import { useId, useState, type FocusEvent } from 'react'
import Button from '../../../shared/components/Button'
import Disclosure from '../../../shared/components/Disclosure'
import Icon from '../../../shared/components/Icon'
import { DecimalInput, Input } from '../../../shared/components/Input'
import { formatInt } from '../../../shared/lib/format'
import { coherenciaEnergetica, procedencia, type ItemRevision, type Por100 } from '../lib/alimentos'
import { sugerirNombreCorto } from '../lib/nombresCortos'
import { NUTRIENTES_ADICIONALES } from '../lib/nutrientes'
import SelectorCategoria from './SelectorCategoria'
import UnidadRacion from './UnidadRacion'

const CAMPOS: { key: Exclude<keyof Por100, 'nutrientes'>; label: string; color: string; aria: string }[] = [
  { key: 'kcal100', label: 'Kcal', color: 'bg-kcal', aria: 'Kcal/100g' },
  { key: 'prot100', label: 'Proteína', color: 'bg-protein', aria: 'Prot/100g' },
  { key: 'carb100', label: 'Hidratos', color: 'bg-carbs', aria: 'Carb/100g' },
  { key: 'grasa100', label: 'Grasa', color: 'bg-fat', aria: 'Grasa/100g' },
]

interface Props {
  item: ItemRevision
  onChange: (patch: Partial<ItemRevision>) => void
  pedirCategoria?: boolean
  nombreCorto?: string
  onCambioNombreCorto?: (editando: boolean) => void
  nombreCortoBloqueado?: boolean
}

/**
 * Detalles de un alimento de la revisión, por partes: el nombre; los valores por 100 g con el color de cada macro (y
 * el aviso si las kcal no cuadran); la categoría si va a crear un alimento; fibra, azúcares, sal y saturadas, plegados;
 * sus raciones; y cómo se llama en tu diario.
 */
export default function DetallesAlimento({ item, onChange, pedirCategoria, nombreCorto, onCambioNombreCorto, nombreCortoBloqueado }: Props) {
  const [escribiendo, setEscribiendo] = useState(false)
  const incoherente = procedencia(item) !== 'catalogo' && !escribiendo ? coherenciaEnergetica(item) : null
  const propuesta = sugerirNombreCorto(item.nombre)
  const [editandoNombre, setEditandoNombre] = useState(false)
  const [borrador, setBorrador] = useState('')
  const idNombre = useId()
  const cerrarNombre = () => { setEditandoNombre(false); onCambioNombreCorto?.(false) }
  const guardarNombre = (nombre?: string) => { onChange({ nombreCorto: nombre, nombreCortoModificado: true }); cerrarNombre() }
  const extrasConocidos = NUTRIENTES_ADICIONALES.filter(({ clave }) => item.nutrientes?.[clave] !== undefined).length

  return <div className="space-y-section">
    <label className="block space-y-1"><span className="text-rotulo text-fg-muted">Nombre</span>
      <Input aria-label="Nombre del alimento" aria-invalid={!item.nombre.trim()} placeholder="Como sale en la etiqueta" value={item.nombre} onChange={(e) => onChange({ nombre: e.target.value })} />
    </label>

    <fieldset className="min-w-0 space-y-3"
      onFocus={(e: FocusEvent) => { if (e.target instanceof HTMLInputElement) setEscribiendo(true) }}
      onBlur={(e: FocusEvent) => { if (e.target instanceof HTMLInputElement) setEscribiendo(false) }}>
      <legend className="text-rotulo text-fg-muted">Por 100 g · kcal y gramos</legend>
      <div className="grid grid-cols-2 gap-3">
        {CAMPOS.map(({ key, label, color, aria }) => <label key={key} className="block min-w-0 space-y-1 rounded-md bg-surface-muted p-3">
          <span className="flex items-center gap-1.5 text-body-sm font-semibold text-fg"><span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-pill ${color}`} /><span className="min-w-0 truncate">{label}</span></span>
          <DecimalInput tone="surface" aria-label={aria} className="tabular" value={item[key]} onChange={(n) => onChange({ [key]: n ?? 0 })} />
        </label>)}
      </div>
      {incoherente && <div role="status" className="space-y-2">
        <p className="flex items-start gap-2 text-body-sm text-warning"><Icon name="alert" size={16} className="mt-0.5 shrink-0" /><span className="min-w-0">Con estos macros salen unas {formatInt(incoherente.esperadas)} kcal, no {formatInt(item.kcal100)}.</span></p>
        <Button variant="secondary" size="sm" onClick={() => onChange({ kcal100: incoherente.esperadas })}>Calcular kcal desde los macros</Button>
      </div>}
    </fieldset>

    {pedirCategoria && <SelectorCategoria valor={item.categoria} onChange={(categoria) => onChange({ categoria })} />}

    <Disclosure title={`Fibra, azúcares, sal y saturadas${extrasConocidos ? ` · ${formatInt(extrasConocidos)} de 4` : ''}`}>
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-3">
          {NUTRIENTES_ADICIONALES.map(({ clave, label }) => <label key={clave} className="block min-w-0 space-y-1">
            <span className="block text-body-sm text-fg">{label} <span className="text-fg-muted">(g)</span></span>
            <DecimalInput aria-label={`${label}/100g`} className="tabular" placeholder="Sin dato" value={item.nutrientes?.[clave]}
              onChange={(n) => {
                const nutrientes = { ...item.nutrientes }
                if (n === undefined) delete nutrientes[clave]
                else nutrientes[clave] = n
                onChange({ nutrientes: Object.keys(nutrientes).length ? nutrientes : undefined })
              }} />
          </label>)}
        </div>
        <p className="text-caption text-fg-muted">Vacío es «no lo sé»; 0, que no tiene.</p>
      </div>
    </Disclosure>

    {!item.sinCoincidencia && <UnidadRacion item={item} onChange={onChange} />}

    <section aria-labelledby={idNombre} className="space-y-2">
      <h3 id={idNombre} className="text-rotulo text-fg-muted">En tu diario</h3>
      {!editandoNombre
        ? <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 break-words text-body font-semibold text-fg">{nombreCorto ?? propuesta}</span>
            <Button variant="secondary" size="sm" disabled={nombreCortoBloqueado} onClick={() => { setBorrador(nombreCorto ?? propuesta); setEditandoNombre(true); onCambioNombreCorto?.(true) }}><Icon name="pencil" size={16} />Cambiar</Button>
          </div>
        : <div className="space-y-2">
            <Input aria-label="Nombre que se verá en Nutrición" value={borrador} maxLength={60} onChange={(e) => setBorrador(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" disabled={!borrador.trim()} onClick={() => guardarNombre(borrador.trim())}>Guardar</Button>
              <Button variant="ghost" size="sm" onClick={cerrarNombre}>Cancelar</Button>
              {nombreCorto && <Button variant="ghost" size="sm" onClick={() => guardarNombre()}>Volver al automático</Button>}
            </div>
          </div>}
    </section>
  </div>
}
