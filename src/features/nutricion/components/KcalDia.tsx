import AnimatedNumber from '../../../shared/components/AnimatedNumber'
import ProgressBar from '../../../shared/components/ProgressBar'
import { MACROS } from '../../../shared/design/macros'
import { formatInt } from '../../../shared/lib/format'
import { fraseKcal } from '../lib/nutrition'

interface Props {
  valor: number
  objetivo: number
}

/**
 * Métrica principal del día. Superar el objetivo se cuenta como una desviación («+92 kcal sobre el objetivo»),
 * con el mismo tono que quedarse por debajo: sin rojo ni avisos.
 */
export default function KcalDia({ valor, objetivo }: Props) {
  const m = MACROS.kcal
  const v = Math.round(valor)
  const g = Math.round(objetivo)
  const diff = v - g
  const hayObjetivo = g > 0

  const frase = fraseKcal(valor, objetivo)
  const valueText = hayObjetivo ? `${formatInt(v)} de ${formatInt(g)} kcal. ${frase}` : `${formatInt(v)} kcal`

  return (
    <section aria-label={m.label}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-label uppercase text-fg-subtle">{m.label}</h2>
        {hayObjetivo && (
          <p className="tabular text-body-sm text-fg-muted">
            Objetivo <strong className="font-semibold text-fg">{formatInt(g)}</strong> kcal
          </p>
        )}
      </div>
      <p className="mt-1 flex items-baseline gap-1.5 text-fg">
        <AnimatedNumber value={v} className="text-metric" />
        <span className="text-body text-fg-muted">kcal</span>
      </p>
      <div className="mt-4">
        <ProgressBar
          size="lg"
          value={valor}
          goal={objetivo}
          colorClass={m.bg}
          label={m.label}
          valueText={valueText}
        />
      </div>
      {frase && (
        <p className="tabular mt-3 text-body-sm text-fg-muted">
          {diff > 0 ? (
            <>
              <strong className="font-semibold text-fg">+{formatInt(diff)} kcal</strong> sobre el objetivo
            </>
          ) : diff < 0 ? (
            <>
              Quedan <strong className="font-semibold text-fg">{formatInt(-diff)} kcal</strong>
            </>
          ) : (
            frase
          )}
        </p>
      )}
    </section>
  )
}
