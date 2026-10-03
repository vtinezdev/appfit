import ProgressBar from '../../../shared/components/ProgressBar'
import { MACROS, type MacroKey } from '../../../shared/design/macros'
import { formatInt } from '../../../shared/lib/format'
interface Props { macro: MacroKey; valor: number; objetivo: number }
export default function MacroBar({ macro, valor, objetivo }: Props) {
  const m = MACROS[macro], v = Math.round(valor), g = Math.round(objetivo)
  const diff = v - g
  return (
    <div className="min-w-0 space-y-2">
      <p className="text-caption text-fg-muted">{macro === 'carbs' ? 'Carbohidr.' : m.label}</p>
      <p className="tabular flex flex-wrap items-baseline gap-x-1 text-fg"><strong className="min-w-0 break-words text-title">{formatInt(v)}</strong><span className="text-caption text-fg-muted">{m.unit}</span></p>
      <ProgressBar value={valor} goal={objetivo} colorClass={m.bg} label={m.label} valueText={`${formatInt(v)} de ${formatInt(g)} ${m.unit}${g > 0 && diff > 0 ? `, ${formatInt(diff)} ${m.unit} sobre el objetivo` : ''}`} />
      {g > 0 && <p className="tabular break-words text-caption text-fg-muted">de {formatInt(g)} {m.unit}{diff > 0 && <span> · +{formatInt(diff)}</span>}</p>}
    </div>
  )
}
