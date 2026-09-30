import AnimatedNumber from '../../../shared/components/AnimatedNumber'
import ProgressBar from '../../../shared/components/ProgressBar'
import { MACROS, type MacroKey } from '../../../shared/design/macros'
import { formatInt } from '../../../shared/lib/format'

interface Props {
  macro: MacroKey
  valor: number
  objetivo: number
}

/**
 * Un macro del día como columna (dentro del hero ink de ResumenNutricional): nombre, cifra, carril con su meta y el objetivo debajo.
 * Color y etiqueta salen de MACROS (un único lenguaje). El exceso se cuenta con «+N» y con el tramo atenuado del carril.
 */
export default function MacroBar({ macro, valor, objetivo }: Props) {
  const m = MACROS[macro]
  const v = Math.round(valor)
  const g = Math.round(objetivo)
  const diff = v - g
  const hayObjetivo = g > 0
  const valueText = `${formatInt(v)} de ${formatInt(g)} ${m.unit}${hayObjetivo && diff > 0 ? `, ${formatInt(diff)} ${m.unit} sobre el objetivo` : ''}`

  return (
    <div className="min-w-0">
      <p className="truncate text-caption text-fg-muted">{m.label}</p>
      <p className="mt-0.5 flex items-baseline gap-1 text-fg">
        <AnimatedNumber value={v} className="text-heading" />
        <span className="text-caption text-fg-muted">{m.unit}</span>
      </p>
      <div className="mt-2">
        <ProgressBar value={valor} goal={objetivo} colorClass={m.bg} label={m.label} valueText={valueText} />
      </div>
      {hayObjetivo && (
        <p className="tabular mt-2 text-caption text-fg-muted">
          de {formatInt(g)} {m.unit}
          {diff > 0 && <strong className="font-semibold text-fg-muted"> · +{formatInt(diff)}</strong>}
        </p>
      )}
    </div>
  )
}
