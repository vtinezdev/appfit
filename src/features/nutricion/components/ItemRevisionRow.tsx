import AnimatedNumber from '../../../shared/components/AnimatedNumber'
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

interface Props {
  item: ItemRevision
  onChange: (patch: Partial<ItemRevision>) => void
  /** Si no se pasa, no se muestra el botón de quitar (p. ej. al editar una entrada). */
  onQuitar?: () => void
  /** Abre «Cambiar alimento». Si no se pasa, no se ofrece (p. ej. al editar una entrada). */
  onCambiar?: () => void
  aviso?: string
}

/** Texto de la etiqueta de procedencia (Tuyo, CIQUAL, Estimado…), o nada si el usuario lo ha escrito o cambiado. */
function textoProcedencia(item: ItemRevision): string | undefined {
  switch (procedencia(item)) {
    case 'tuyo':
      return 'Tuyo'
    case 'catalogo':
      return etiquetaFuente(item.origen.catalogId!.split(':')[0])
    case 'estimado':
      return 'Estimado'
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
export default function ItemRevisionRow({ item, onChange, onQuitar, onCambiar, aviso }: Props) {
  const aporte = macrosPorGramos(item, item.gramos)
  const kcal = Math.round(aporte.kcal)
  const sinNombre = !item.nombre.trim()
  const etiqueta = textoProcedencia(item)
  const { medida } = item
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

      {(etiqueta || onCambiar) && (
        <div className="-my-2 flex items-center justify-between gap-2">
          {etiqueta ? <span className="rounded-pill bg-surface-muted px-2 py-0.5 text-caption text-fg-muted">{etiqueta}</span> : <span />}
          {onCambiar && (
            <Button variant="ghost" size="sm" className="-mr-3" onClick={onCambiar} aria-label={`Cambiar ${item.nombre || 'alimento'}`}>
              Cambiar
            </Button>
          )}
        </div>
      )}

      {medida && <SelectorMedida medida={medida} onElegir={(g) => onChange(elegirMedida(medida, g))} />}

      {!medidaPendiente(item) && (
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
      )}

      <MacroInputs layout="row" valores={item} onChange={onChange} />

      {item.sinCoincidencia && <Aviso>No encontrado: busca con «Cambiar» o escribe los valores por 100 g.</Aviso>}
      {item.datosIncompletos && <Aviso>Faltan datos del producto: completa el nombre y los valores por 100 g de la etiqueta.</Aviso>}
      {item.gramosEstimados && <Aviso>Cantidad estimada: revisa los gramos.</Aviso>}
      {aviso && <Aviso>{aviso}</Aviso>}
    </div>
  )
}
