import type { ReactNode } from 'react'
import Card from '../../../shared/components/Card'
import ProgressBar from '../../../shared/components/ProgressBar'
import type { Objetivos } from '../../../shared/db/types'
import { MACROS, type MacroKey } from '../../../shared/design/macros'
import { formatInt } from '../../../shared/lib/format'
import { fraseKcal, type Macros } from '../lib/nutrition'
interface Props {
  totales: Macros
  objetivos: Objetivos
  /** Nombre accesible de la sección (el diario ya se titula «Nutrición» y muestra el día encima). */
  titulo?: string
  /** Desglose opcional dentro del mismo panel, sin cambiar el resumen sencillo. */
  detalle?: ReactNode
  controles?: ReactNode
}

const CARRILES: { macro: MacroKey; nombre: string; valor: (t: Macros) => number; objetivo: (o: Objetivos) => number }[] = [
  { macro: 'kcal', nombre: 'Energía', valor: t => t.kcal, objetivo: o => o.kcal },
  { macro: 'prot', nombre: 'Proteína', valor: t => t.prot, objetivo: o => o.prot },
  { macro: 'carbs', nombre: 'Hidratos', valor: t => t.carb, objetivo: o => o.carb },
  { macro: 'fat', nombre: 'Grasa', valor: t => t.grasa, objetivo: o => o.grasa },
]

/** Panel del diario en carriles: energía y macros, cada uno con su barra hasta el objetivo y «1.340 / 2.200». */
export default function ResumenNutricional({ totales, objetivos, titulo = 'Resumen del día', detalle, controles }: Props) {
  const frase = fraseKcal(totales.kcal, objetivos.kcal)
  return (
    <section aria-label={titulo}>
      <Card className="nutrition-summary space-y-4">
        {CARRILES.map(({ macro, nombre, valor, objetivo }) => {
          const m = MACROS[macro], v = Math.round(valor(totales)), g = Math.round(objetivo(objetivos)), diff = v - g
          return <div key={macro} className="space-y-1.5">
            <p className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-body-sm font-semibold text-fg">{nombre}</span>
              <span className="tabular text-body-sm"><strong className="font-semibold text-fg">{formatInt(v)}</strong>{g > 0 && <span className="text-fg-muted"> / {formatInt(g)}</span>} <span className="text-caption text-fg-muted">{m.unit}</span></span>
            </p>
            <ProgressBar value={valor(totales)} goal={objetivo(objetivos)} size={macro === 'kcal' ? 'lg' : 'md'} colorClass={m.bg} label={m.label}
              valueText={`${formatInt(v)} de ${formatInt(g)} ${m.unit}${macro === 'kcal' ? `. ${frase ?? ''}` : g > 0 && diff > 0 ? `, ${formatInt(diff)} ${m.unit} sobre el objetivo` : ''}`} />
            {macro === 'kcal' && frase && <p className="tabular text-caption text-fg-muted">{frase}</p>}
          </div>
        })}
        {controles}
        {detalle}
      </Card>
    </section>
  )
}
