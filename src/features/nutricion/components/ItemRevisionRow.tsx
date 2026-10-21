import PreparacionAlimento from './PreparacionAlimento'
import { useId, useState } from 'react'
import Disclosure from '../../../shared/components/Disclosure'
import Metric from '../../../shared/components/Metric'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import { Input, Select } from '../../../shared/components/Input'
import NumberStepper from '../../../shared/components/NumberStepper'
import { faltaCategoria, faltanValores, medidaPendiente, procedencia, type ItemRevision } from '../lib/alimentos'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { etiquetaFuente } from '../lib/catalogo/textos'
import { elegirMedida, preguntaMedida, textoOpcionMedida, type MedidaAmbigua } from '../lib/interprete/medidas'
import { macrosPorGramos, resumenMacros } from '../lib/nutrition'
import MacroInputs from './MacroInputs'
import { sugerirNombreCorto } from '../lib/nombresCortos'
import NutrientesDetalle from './NutrientesDetalle'
import UnidadRacion from './UnidadRacion'
import SelectorCategoria from './SelectorCategoria'
import IconoCategoria from './IconoCategoria'

interface Props {
  item: ItemRevision
  onChange: (patch: Partial<ItemRevision>) => void
  onQuitar?: () => void
  onCambiar?: () => void
  aviso?: string
  nombreCorto?: string
  onCambioNombreCorto?: (editando: boolean) => void
  nombreCortoBloqueado?: boolean
  /** El ítem creará un alimento propio: se muestra (y exige) su categoría. */
  pedirCategoria?: boolean
  editarInicial?: boolean
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
export default function ItemRevisionRow({ item, onChange, onQuitar, onCambiar, aviso, nombreCorto, onCambioNombreCorto, nombreCortoBloqueado, pedirCategoria, editarInicial = false }: Props) {
  const aporte = macrosPorGramos(item, item.gramos)
  const kcal = Math.round(aporte.kcal)
  const sinNombre = !item.nombre.trim()
  const requiereDatos = sinNombre || faltanValores(item) || !!item.sinCoincidencia || !!item.datosIncompletos || (!!pedirCategoria && faltaCategoria(item))
  const [editando, setEditando] = useState(editarInicial)
  const abierto = editando || requiereDatos || medidaPendiente(item)
  const editorId = useId()
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
    <div className="min-w-0 px-3 py-2">
      <div className="flex items-center gap-2">
        <IconoCategoria categoria={item.categoria} sinCategoria="hueco" inicial={(item.nombre || '?').slice(0, 1)} />
        <button type="button" aria-label={`Editar ${item.nombre || 'alimento'}`} aria-expanded={abierto} aria-controls={editorId}
          onClick={() => { if (!requiereDatos && !medidaPendiente(item)) { cancelarNombre(); setEditando(!abierto) } }}
          className="flex min-h-touch min-w-0 flex-1 items-center gap-2 py-2 text-left text-fg">
          <span className="min-w-0 flex-1">
            <span className="block break-words text-body font-semibold">{item.nombre || 'Alimento sin nombre'}</span>
            <span className="mt-1 inline-block max-w-full break-words rounded-sm bg-surface-muted px-2 py-1 text-caption text-fg-muted">{medidaPendiente(item) ? 'Elige la cantidad' : `${formatNumber(item.gramos, 1)} g`}</span>
          </span>
          <span className="tabular min-w-0 break-words text-right text-body-sm font-semibold">{formatInt(kcal)}<span className="block text-caption font-normal text-fg-muted">kcal</span></span>
          <Icon name="chevron-right" size={18} className={`shrink-0 text-fg-subtle ${abierto ? 'rotate-90' : ''}`} />
        </button>
      </div>
      {item.gramosEstimados && <div className="py-2"><Aviso>Cantidad estimada: revisa los gramos.</Aviso></div>}
      {aviso && <div className="py-2"><Aviso>{aviso}</Aviso></div>}
      {!abierto && <PreparacionAlimento nombre={item.nombre} />}
      <div id={editorId} hidden={!abierto} className="space-y-3 border-t border-line pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {etiqueta && <p className="text-caption text-fg-muted">{etiqueta}</p>}
        {onQuitar && <Button variant="subtle" size="sm" onClick={() => { cancelarNombre(); onQuitar() }} aria-label={`Quitar ${item.nombre || 'alimento'}`}><Icon name="trash" size={18} />Quitar</Button>}
      </div>
      <PreparacionAlimento nombre={item.nombre} explicar />
      {item.medida && <SelectorMedida medida={item.medida} onElegir={(g) => onChange(elegirMedida(item.medida!, g))} />}
      {!medidaPendiente(item) && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1"><p className="text-label text-fg-muted">Cantidad</p><NumberStepper label="gramos" value={item.gramos} onChange={(v) => onChange({ gramos: v })} step={10} suffix="g" /></div>
          <Metric valor={kcal} unidad="kcal" size="title" align="right" caption={resumenMacros(aporte)} />
        </div>
      )}
      {!medidaPendiente(item) && !item.sinCoincidencia && <UnidadRacion item={item} onChange={onChange} />}
      {pedirCategoria && <SelectorCategoria valor={item.categoria} onChange={(categoria) => onChange({ categoria })} />}
      {item.sinCoincidencia && <Aviso>No encontrado: busca con «Cambiar» o escribe los valores por 100 g.</Aviso>}
      {item.datosIncompletos && <Aviso>Faltan datos: completa el nombre y los valores de la etiqueta.</Aviso>}
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
      </div>
    </div>
  )
}
