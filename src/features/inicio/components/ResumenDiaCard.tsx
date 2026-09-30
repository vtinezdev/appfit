import AnimatedNumber from '../../../shared/components/AnimatedNumber'
import Button from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import ProgressBar from '../../../shared/components/ProgressBar'
import ProgressRing from '../../../shared/components/ProgressRing'
import { MACROS, type MacroKey } from '../../../shared/design/macros'
import type { Objetivos } from '../../../shared/db/types'
import { formatInt } from '../../../shared/lib/format'
import { fraseKcal, type Macros } from '../../nutricion/lib/nutrition'

interface Props {
  totales: Macros
  objetivos: Objetivos
  onVerDia: () => void
}

const LINEAS: { macro: MacroKey; campo: 'prot' | 'carb' | 'grasa' }[] = [
  { macro: 'prot', campo: 'prot' },
  { macro: 'carbs', campo: 'carb' },
  { macro: 'fat', campo: 'grasa' },
]

/**
 * Resumen del día en Inicio: anillo de kcal (cifra en el centro) y tres carriles compactos P/C/G.
 * Mismo lenguaje que Hoy: el objetivo es una marca, superarlo no cambia de color.
 */
export default function ResumenDiaCard({ totales, objetivos, onVerDia }: Props) {
  const kcal = Math.round(totales.kcal)
  const frase = fraseKcal(totales.kcal, objetivos.kcal)
  const m = MACROS.kcal
  const valueText = frase ? `${formatInt(kcal)} de ${formatInt(objetivos.kcal)} kcal. ${frase}` : `${formatInt(kcal)} kcal`

  return (
    <Card>
      <section aria-label="Resumen de hoy" className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-title text-fg">Hoy</h2>
          <Button variant="ghost" size="sm" className="-mr-3" onClick={onVerDia}>
            Ver día
            <Icon name="chevron-right" size={16} />
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <ProgressRing value={totales.kcal} goal={objetivos.kcal} colorClass="stroke-kcal" size={128} thickness={12} label={m.label} valueText={valueText}>
            <AnimatedNumber value={kcal} className="text-heading text-fg" />
            <span className="tabular text-caption text-fg-subtle">{objetivos.kcal > 0 ? `de ${formatInt(objetivos.kcal)}` : 'kcal'}</span>
          </ProgressRing>
          <div className="min-w-0 flex-1 space-y-3">
            {LINEAS.map(({ macro, campo }) => {
              const mm = MACROS[macro]
              const v = Math.round(totales[campo])
              const g = Math.round(objetivos[campo])
              const texto = `${formatInt(v)} de ${formatInt(g)} ${mm.unit}`
              return (
                <div key={macro}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-label text-fg-muted">{mm.label}</span>
                    <span className="tabular shrink-0 text-caption text-fg-subtle">
                      <strong className="font-semibold text-fg">{formatInt(v)}</strong> / {formatInt(g)} {mm.unit}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <ProgressBar value={totales[campo]} goal={objetivos[campo]} colorClass={mm.bg} label={mm.label} valueText={texto} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        {frase && <p className="tabular text-body-sm text-fg-muted">{frase}</p>}
      </section>
    </Card>
  )
}
