import { useId, useState } from 'react'
import Card from '../../../shared/components/Card'
import Disclosure from '../../../shared/components/Disclosure'
import Metric from '../../../shared/components/Metric'
import Button, { IconButton } from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import { Input, Select } from '../../../shared/components/Input'
import NumberStepper from '../../../shared/components/NumberStepper'
import { faltanValores, medidaPendiente, procedencia, type ItemRevision } from '../lib/alimentos'
import { etiquetaFuente } from '../lib/catalogo/textos'
import { elegirMedida, preguntaMedida, textoOpcionMedida, type MedidaAmbigua } from '../lib/interprete/medidas'
import { macrosPorGramos, resumenMacros } from '../lib/nutrition'
import MacroInputs from './MacroInputs'
import { sugerirNombreCorto } from '../lib/nombresCortos'
import NutrientesDetalle from './NutrientesDetalle'
import UnidadRacion from './UnidadRacion'

interface Props {
  item: ItemRevision
  onChange: (patch: Partial<ItemRevision>) => void
  onQuitar?: () => void
  onCambiar?: () => void
  aviso?: string
  nombreCorto?: string
  onCambioNombreCorto?: (editando: boolean) => void
  nombreCortoBloqueado?: boolean
}
function textoProcedencia(item: ItemRevision): string | undefined {
  switch (procedencia(item)) {
    case 'tuyo': return 'Tu alimento'
    case 'catalogo': return etiquetaFuente(item.origen.catalogId!.split(':')[0])
    default: return undefined
  }
}
function Aviso({ children }: { children: string }) {
  return <p className="flex items-start gap-2 text-body-sm text-warning"><Icon name="alert" size={16} className="mt-0.5" /><span className="min-w-0">{children}</span></p>
}
function SelectorMedida({ medida, onElegir }: { medida: MedidaAmbigua; onElegir: (gramosPorUnidad: number) => void }) {
  return (
    <label className="block space-y-1">
      <span className="block text-label text-fg-muted">{preguntaMedida(medida)}</span>
      <Select value={medida.elegida ?? ''} onChange={(e) => onElegir(Number(e.target.value))} aria-invalid={medida.elegida === undefined}>
        <option value="" disabled>Elige una cantidad</option>
        {medida.opciones.map((g) => <option key={g} value={g}>{textoOpcionMedida(medida, g)}</option>)}
      </Select>
    </label>
  )
}
/** Revisión rápida: alimento completo, cantidad y aporte; edición avanzada bajo demanda. */
export default function ItemRevisionRow({ item, onChange, onQuitar, onCambiar, aviso, nombreCorto, onCambioNombreCorto, nombreCortoBloqueado }: Props) {
  const aporte = macrosPorGramos(item, item.gramos)
  const kcal = Math.round(aporte.kcal)
  const sinNombre = !item.nombre.trim()
  const requiereDatos = sinNombre || faltanValores(item) || !!item.sinCoincidencia || !!item.datosIncompletos
  const [detalles, setDetalles] = useState(requiereDatos)
  const propuesta = sugerirNombreCorto(item.nombre)
  const idNombreCorto = useId()
  const [editandoNombreCorto, setEditandoNombreCorto] = useState(false)
  const [borradorNombreCorto, setBorradorNombreCorto] = useState('')
  const etiqueta = textoProcedencia(item)
  const cancelarNombre = () => { setEditandoNombreCorto(false); if (editandoNombreCorto) onCambioNombreCorto?.(false) }
  const guardarNombre = (nombre?: string) => {
    onChange({ nombreCorto: nombre, nombreCortoModificado: true })
    cancelarNombre()
  }
  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-body font-semibold text-fg">{item.nombre || 'Alimento sin nombre'}</h3>
          {etiqueta && <p className="mt-1 text-caption text-fg-muted">{etiqueta}</p>}
        </div>
        {onQuitar && <IconButton icon="trash" label={`Quitar ${item.nombre || 'alimento'}`} variant="ghost" size="sm" className="-mr-2 -mt-1" onClick={() => { cancelarNombre(); onQuitar() }} />}
      </div>
      {item.medida && <SelectorMedida medida={item.medida} onElegir={(g) => onChange(elegirMedida(item.medida!, g))} />}
      {!medidaPendiente(item) && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1"><p className="text-label text-fg-muted">Cantidad</p><NumberStepper label="gramos" value={item.gramos} onChange={(v) => onChange({ gramos: v })} step={10} suffix="g" /></div>
          <Metric valor={kcal} unidad="kcal" size="title" align="right" caption={resumenMacros(aporte)} />
        </div>
      )}
      {!medidaPendiente(item) && !item.sinCoincidencia && <UnidadRacion item={item} onChange={onChange} />}
      {item.sinCoincidencia && <Aviso>No encontrado: busca con «Cambiar» o escribe los valores por 100 g.</Aviso>}
      {item.datosIncompletos && <Aviso>Faltan datos: completa el nombre y los valores de la etiqueta.</Aviso>}
      {item.gramosEstimados && <Aviso>Cantidad estimada: revisa los gramos.</Aviso>}
      {aviso && <Aviso>{aviso}</Aviso>}
      {onCambiar && <Button variant="ghost" size="sm" className="-ml-3" onClick={() => { cancelarNombre(); onCambiar() }} aria-label={`Cambiar ${item.nombre || 'alimento'}`}>Cambiar alimento</Button>}
      <Disclosure title="Detalles del alimento" open={detalles || requiereDatos} onChange={(open) => { setDetalles(open); if (!open) cancelarNombre() }}>
        <div className="space-y-4">
          <label className="block space-y-1"><span className="text-label text-fg-muted">Nombre completo</span>
            <Input aria-label="Nombre del alimento" aria-invalid={sinNombre} placeholder="Nombre del alimento" value={item.nombre} onChange={(e) => onChange({ nombre: e.target.value })} />
          </label>
          <MacroInputs detallado valores={item} onChange={onChange} />
          {!medidaPendiente(item) && <NutrientesDetalle entries={[aporte]} titulo="Aporte de la cantidad indicada" />}
          <div className="space-y-2 border-t border-line pt-3">
            <p className="text-body-sm text-fg-muted">En Nutrición: <strong className="font-semibold text-fg">{nombreCorto ?? propuesta}</strong></p>
            {!editandoNombreCorto && <Button variant="ghost" size="sm" className="-ml-3" disabled={nombreCortoBloqueado} onClick={() => { setBorradorNombreCorto(nombreCorto ?? propuesta); setEditandoNombreCorto(true); onCambioNombreCorto?.(true) }} aria-label={`${nombreCorto ? 'Cambiar' : 'Personalizar'} nombre en Nutrición para ${item.nombre}`}>{nombreCorto ? 'Cambiar nombre simple' : 'Personalizar nombre simple'}</Button>}
            {editandoNombreCorto && (
              <div className="space-y-2">
                <label htmlFor={idNombreCorto} className="block text-label text-fg-muted">Nombre que se verá en Nutrición</label>
                <Input id={idNombreCorto} aria-label="Nombre que se verá en Nutrición" value={borradorNombreCorto} maxLength={60} onChange={(e) => setBorradorNombreCorto(e.target.value)} />
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" disabled={!borradorNombreCorto.trim()} onClick={() => guardarNombre(borradorNombreCorto.trim())}>Guardar nombre</Button>
                  <Button variant="ghost" size="sm" onClick={cancelarNombre}>Cancelar</Button>
                  {nombreCorto && <Button variant="ghost" size="sm" onClick={() => guardarNombre()}>Usar sugerencia automática</Button>}
                </div>
              </div>
            )}
          </div>
        </div>
      </Disclosure>
    </Card>
  )
}
