import type { ReactNode } from 'react'
import Card from '../../../shared/components/Card'
import Metric from '../../../shared/components/Metric'
import ProgressBar from '../../../shared/components/ProgressBar'
import type { Objetivos } from '../../../shared/db/types'
import { formatInt } from '../../../shared/lib/format'
import { fraseKcal, type Macros } from '../lib/nutrition'
import MacroBar from './MacroBar'
interface Props {
  totales: Macros
  objetivos: Objetivos
  titulo?: string
  accion?: ReactNode
  /** Desglose opcional dentro del mismo panel, sin cambiar el resumen sencillo. */
  detalle?: ReactNode
  controles?: ReactNode
  footer?: ReactNode
  /** Inicio integra consumo en la página; el diario conserva su panel y controles. */
  integrado?: boolean
  /** El diario ya se titula «Nutrición» y muestra el día encima: el título visible sobra (queda como nombre de la sección). */
  tituloVisible?: boolean
}
/** Panel diario compartido: una métrica principal, macros y detalle opcional. */
export default function ResumenNutricional({ totales, objetivos, titulo = 'Resumen del día', accion, detalle, controles, footer, integrado = false, tituloVisible = true }: Props) {
  const v = Math.round(totales.kcal), g = Math.round(objetivos.kcal)
  const frase = fraseKcal(totales.kcal, objetivos.kcal)
  const Contenedor = integrado ? 'div' : Card
  return (
    <section aria-label={titulo}>
      <Contenedor className={`nutrition-summary space-y-3 ${integrado ? 'py-2' : ''}`}>
        {(tituloVisible || accion) && <div className="flex min-h-touch items-center justify-between gap-2">
          {tituloVisible && <h2 className="min-w-0 text-heading text-fg">Nutrición · {titulo === 'Resumen de hoy' ? 'hoy' : 'día'}</h2>}
          {accion}
        </div>}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Metric size="hero" className="calorie-value" valor={v} unidad="kcal" />
          {g > 0 && <p className="tabular pb-1 text-body-sm text-fg-muted">de <strong className="font-semibold text-fg">{formatInt(g)}</strong> kcal</p>}
        </div>
        <ProgressBar value={totales.kcal} goal={objetivos.kcal} size="lg" colorClass="bg-kcal" label="Calorías" valueText={`${formatInt(v)} de ${formatInt(g)} kcal. ${frase ?? ''}`} />
        {frase && <p className="tabular text-body-sm text-fg-muted">{frase}</p>}
        <div className="grid grid-cols-3 gap-3 pt-3">
          <MacroBar macro="prot" valor={totales.prot} objetivo={objetivos.prot} />
          <MacroBar macro="carbs" valor={totales.carb} objetivo={objetivos.carb} />
          <MacroBar macro="fat" valor={totales.grasa} objetivo={objetivos.grasa} />
        </div>
        {controles}
        {detalle}
        {footer}
      </Contenedor>
    </section>
  )
}
