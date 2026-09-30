import { MACROS } from '../../../shared/design/macros'
import { formatInt } from '../../../shared/lib/format'
import { distribucionPCG, type Macros } from '../lib/nutrition'

interface Props {
  macros: Macros
}

const TRAMOS = [
  { key: 'prot', macro: MACROS.prot, campo: 'prot' },
  { key: 'carbs', macro: MACROS.carbs, campo: 'carb' },
  { key: 'fat', macro: MACROS.fat, campo: 'grasa' },
] as const

/**
 * Reparto de kcal de una comida entre proteína, carbohidratos y grasa: barra fina segmentada (un tramo por macro,
 * con un pequeño hueco) y debajo los gramos. La letra va con el color del macro y el reparto también se dice en
 * texto (aria-label), así que el color no es el único indicador. Sin macros (solo kcal rápidas) no se dibuja.
 */
export default function FranjaMacros({ macros }: Props) {
  const dist = distribucionPCG(macros)
  const tramos = TRAMOS.filter((t) => dist[t.campo] > 0)
  if (tramos.length === 0) return null
  const aria = `Reparto de calorías: ${tramos.map((t) => `${t.macro.label.toLowerCase()} ${dist[t.campo]} %`).join(', ')}`

  return (
    <div>
      <div role="img" aria-label={aria} className="flex h-1.5 gap-0.5">
        {tramos.map((t) => (
          <div key={t.key} className={`h-full min-w-0 rounded-pill ${t.macro.bg}`} style={{ width: `${dist[t.campo]}%` }} />
        ))}
      </div>
      <p className="tabular mt-2 text-caption text-fg-muted">
        {TRAMOS.map((t, i) => (
          <span key={t.key}>
            {i > 0 && ' · '}
            <span className={`font-semibold ${t.macro.text}`}>{t.macro.short}</span> {formatInt(macros[t.campo])} g
          </span>
        ))}
      </p>
    </div>
  )
}
