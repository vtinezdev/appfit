import { useId, useState } from 'react'
import Badge from '../../../shared/components/Badge'
import Metric from '../../../shared/components/Metric'
import { IconButton } from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import { Input, Select } from '../../../shared/components/Input'
import NumberStepper from '../../../shared/components/NumberStepper'
import Button from '../../../shared/components/Button'
import { medidaPendiente, procedencia, type ItemRevision } from '../lib/alimentos'
import { etiquetaFuente } from '../lib/catalogo/textos'
import { elegirMedida, preguntaMedida, textoOpcionMedida, type MedidaAmbigua } from '../lib/interprete/medidas'
import { macrosPorGramos, resumenMacros } from '../lib/nutrition'
import MacroInputs from './MacroInputs'
import { sugerirNombreCorto } from '../lib/nombresCortos'

interface Props {
  item: ItemRevision
  onChange: (patch: Partial<ItemRevision>) => void
  /** Si no se pasa, no se muestra el botón de quitar (p. ej. al editar una entrada). */
  onQuitar?: () => void
  /** Abre «Cambiar alimento». Si no se pasa, no se ofrece (p. ej. al editar una entrada). */
  onCambiar?: () => void
  aviso?: string
  nombreCorto?: string
  onCambioNombreCorto?: (editando: boolean) => void
  nombreCortoBloqueado?: boolean
}

/** Texto de la etiqueta de procedencia (Tuyo, CIQUAL…), o nada si el usuario lo ha escrito o cambiado. */
function textoProcedencia(item: ItemRevision): string | undefined {
  switch (procedencia(item)) {
    case 'tuyo':
      return 'Tuyo'
    case 'catalogo':
      return etiquetaFuente(item.origen.catalogId!.split(':')[0])
    default:
      return undefined
  }
}

function Aviso({ children }: { children: string }) {
  return (
    <p className="flex items-start gap-2 text-caption text-warning">
      <Icon name="alert" size={16} className="mt-px" />
      <span className="min-w-0">{children}</span>
    </p>
  )
}

/** «¿Cuánto es una cucharada?»: elige los gramos de una medida casera ambigua. Sin elegir, no hay opción marcada. */
function SelectorMedida({ medida, onElegir }: { medida: MedidaAmbigua; onElegir: (gramosPorUnidad: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-caption text-fg-muted">{preguntaMedida(medida)}</span>
      <Select value={medida.elegida ?? ''} onChange={(e) => onElegir(Number(e.target.value))} aria-invalid={medida.elegida === undefined}>
        <option value="" disabled>
          Elige una cantidad
        </option>
        {medida.opciones.map((g) => (
          <option key={g} value={g}>
            {textoOpcionMedida(medida, g)}
          </option>
        ))}
      </Select>
    </label>
  )
}

/**
 * Un alimento en la revisión, como fila de una lista (la Card que las agrupa la pone quien las usa).
 * Orden de lectura: nombre → cantidad → lo que aporta (kcal con presencia, P/C/G debajo) → valores por 100 g, todo editable.
 * Las kcal y los macros son los mismos que se guardarán (`macrosPorGramos`). Con una medida ambigua («una cucharada»),
 * primero se elige cuánto pesa y hasta entonces no se muestran gramos ni kcal.
 */
export default function ItemRevisionRow({ item, onChange, onQuitar, onCambiar, aviso, nombreCorto, onCambioNombreCorto, nombreCortoBloqueado }: Props) {
  const aporte = macrosPorGramos(item, item.gramos)
  const kcal = Math.round(aporte.kcal)
  const sinNombre = !item.nombre.trim()
  const etiqueta = textoProcedencia(item)
  const { medida } = item
  const propuesta = sugerirNombreCorto(item.nombre)
  const idNombreCorto = useId()
  const [editandoNombreCorto, setEditandoNombreCorto] = useState(false)
  const [borradorNombreCorto, setBorradorNombreCorto] = useState('')

  function abrirNombreCorto() {
    setBorradorNombreCorto(nombreCorto ?? propuesta)
    setEditandoNombreCorto(true)
    onCambioNombreCorto?.(true)
  }
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
        {onQuitar && (
          <IconButton
            icon="trash"
            label={`Quitar ${item.nombre || 'alimento'}`}
            variant="ghost"
            size="sm"
            onClick={() => {
              if (editandoNombreCorto) {
                setEditandoNombreCorto(false)
                onCambioNombreCorto?.(false)
              }
              onQuitar()
            }}
          />
        )}
      </div>

      {(etiqueta || onCambiar) && (
        <div className="-my-2 flex items-center justify-between gap-2">
          {etiqueta ? <Badge>{etiqueta}</Badge> : <span />}
          {onCambiar && (
            <Button variant="ghost" size="sm" className="-mr-3" onClick={onCambiar} aria-label={`Cambiar ${item.nombre || 'alimento'}`}>
              Cambiar
            </Button>
          )}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 text-body-sm text-fg-muted">
            En Nutrición: <span className="font-medium text-fg">{nombreCorto ?? propuesta}</span>
            {nombreCorto && <span className="text-caption"> · personalizado</span>}
          </p>
          <Button variant="ghost" size="sm" disabled={nombreCortoBloqueado && !editandoNombreCorto} onClick={abrirNombreCorto} aria-label={`${nombreCorto ? 'Cambiar' : 'Personalizar'} nombre en Nutrición para ${item.nombre}`}>
            {nombreCorto ? 'Cambiar' : 'Personalizar'}
          </Button>
        </div>
        {editandoNombreCorto && (
          <div className="space-y-2">
            <label htmlFor={idNombreCorto} className="block text-caption text-fg-muted">
              Nombre que se verá en Nutrición
            </label>
            <Input
              id={idNombreCorto}
              value={borradorNombreCorto}
              maxLength={60}
              onChange={(e) => setBorradorNombreCorto(e.target.value)}
              aria-label="Nombre que se verá en Nutrición"
            />
            <div className="flex flex-wrap items-center gap-1">
              <Button
                variant="secondary"
                size="sm"
                disabled={!borradorNombreCorto.trim()}
                  onClick={() => {
                    onChange({ nombreCorto: borradorNombreCorto.trim(), nombreCortoModificado: true })
                    setEditandoNombreCorto(false)
                    onCambioNombreCorto?.(false)
                }}
              >
                Guardar nombre
              </Button>
              {nombreCorto && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onChange({ nombreCorto: undefined, nombreCortoModificado: true })
                    setEditandoNombreCorto(false)
                    onCambioNombreCorto?.(false)
                  }}
                >
                  Usar sugerencia automática
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditandoNombreCorto(false)
                  onCambioNombreCorto?.(false)
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>

      {medida && <SelectorMedida medida={medida} onElegir={(g) => onChange(elegirMedida(medida, g))} />}

      {!medidaPendiente(item) && (
        <div className="flex items-center justify-between gap-3">
          <NumberStepper label="gramos" value={item.gramos} onChange={(v) => onChange({ gramos: v })} step={10} suffix="g" />
          <Metric valor={kcal} animate unidad="kcal" size="title" align="right" caption={resumenMacros(aporte)} />
        </div>
      )}

      <MacroInputs layout="row" valores={item} onChange={onChange} />

      {item.sinCoincidencia && <Aviso>No encontrado: busca con «Cambiar» o escribe los valores por 100 g.</Aviso>}
      {item.datosIncompletos && <Aviso>Faltan datos del producto: completa el nombre y los valores por 100 g de la etiqueta.</Aviso>}
      {item.gramosEstimados && <Aviso>Cantidad estimada: revisa los gramos.</Aviso>}
      {aviso && <Aviso>{aviso}</Aviso>}
    </div>
  )
}
