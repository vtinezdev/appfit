import type { ReactNode } from 'react'
import AnimatedNumber from '../../../shared/components/AnimatedNumber'
import Card from '../../../shared/components/Card'
import ProgressRing from '../../../shared/components/ProgressRing'
import { MACROS } from '../../../shared/design/macros'
import type { Objetivos } from '../../../shared/db/types'
import { formatInt } from '../../../shared/lib/format'
import { fraseKcal, type Macros } from '../lib/nutrition'
import MacroBar from './MacroBar'

interface Props {
  totales: Macros
  objetivos: Objetivos
  /** Etiqueta accesible de la región («Resumen de hoy», «Resumen del martes»). */
  titulo?: string
  /** Acción opcional arriba a la derecha (p. ej. «Ver día ›» en Inicio). */
  accion?: ReactNode
}

/**
 * El resumen del día, compartido por Inicio y Hoy: el hero ink de la pantalla. Cifra de kcal a tamaño `hero`, anillo
 * naranja con el objetivo en el centro y tres carriles P/C/G. Superar el objetivo se cuenta con texto («+92 kcal
 * sobre el objetivo») y con el tramo atenuado, sin rojo. Los colores salen de los tokens ink: no hay variantes aquí.
 */
export default function ResumenNutricional({ totales, objetivos, titulo = 'Resumen del día', accion }: Props) {
  const m = MACROS.kcal
  const v = Math.round(totales.kcal)
  const g = Math.round(objetivos.kcal)
  const diff = v - g
  const frase = fraseKcal(totales.kcal, objetivos.kcal)
  const valueText = frase ? `${formatInt(v)} de ${formatInt(g)} kcal. ${frase}` : `${formatInt(v)} kcal`

  return (
    <Card tone="ink" role="region" aria-label={titulo} className="space-y-5">
      <div className="flex min-h-touch items-center justify-between gap-2">
        <h2 className="text-label uppercase text-fg-subtle">{m.label}</h2>
        {accion && <div className="-mr-2">{accion}</div>}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-baseline gap-1.5 text-fg">
            <AnimatedNumber value={v} className="text-hero" />
            <span className="text-body text-fg-muted">kcal</span>
          </p>
          {frase && (
            <p className="tabular mt-2 text-body-sm text-fg-muted">
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
        </div>
        <ProgressRing value={totales.kcal} goal={objetivos.kcal} colorClass="stroke-kcal" size={96} thickness={10} label={m.label} valueText={valueText}>
          {g > 0 && (
            <>
              <span className="tabular text-title text-fg">{formatInt(g)}</span>
              <span className="text-caption text-fg-subtle">objetivo</span>
            </>
          )}
        </ProgressRing>
      </div>

      <div className="grid grid-cols-3 gap-4 border-t border-line pt-5">
        <MacroBar macro="prot" valor={totales.prot} objetivo={objetivos.prot} />
        <MacroBar macro="carbs" valor={totales.carb} objetivo={objetivos.carb} />
        <MacroBar macro="fat" valor={totales.grasa} objetivo={objetivos.grasa} />
      </div>
    </Card>
  )
}
