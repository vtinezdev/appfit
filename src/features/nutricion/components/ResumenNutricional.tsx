import type { ReactNode } from 'react'
import Card from '../../../shared/components/Card'
import Disclosure from '../../../shared/components/Disclosure'
import Metric from '../../../shared/components/Metric'
import ProgressBar from '../../../shared/components/ProgressBar'
import type { Objetivos } from '../../../shared/db/types'
import { MACROS, type MacroKey } from '../../../shared/design/macros'
import { formatInt } from '../../../shared/lib/format'
import { fraseKcal, restoKcal, type Macros } from '../lib/nutrition'

interface Props {
  totales: Macros
  objetivos: Objetivos
  titulo?: string
  detalle?: ReactNode
}
const CARRILES: { macro: MacroKey; nombre: string; valor: (t: Macros) => number; objetivo: (o: Objetivos) => number }[] = [
  { macro: 'prot', nombre: 'Proteína', valor: t => t.prot, objetivo: o => o.prot },
  { macro: 'carbs', nombre: 'Hidratos', valor: t => t.carb, objetivo: o => o.carb },
  { macro: 'fat', nombre: 'Grasa', valor: t => t.grasa, objetivo: o => o.grasa },
]

/** Energía y diferencia juntas, macros en tres columnas; el desglose solo se abre al pedirlo. */
export default function ResumenNutricional({ totales, objetivos, titulo = 'Resumen del día', detalle }: Props) {
  const frase = fraseKcal(totales.kcal, objetivos.kcal)
  const resto = restoKcal(totales.kcal, objetivos.kcal)
  return <section aria-label={titulo}>
    <Card className="nutrition-summary space-y-stack">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-caption text-fg-muted">
        <span className="text-rotulo">Tu energía</span>
        {objetivos.kcal > 0 && <span className="tabular">Objetivo {formatInt(objetivos.kcal)} kcal</span>}
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Metric size="metric" valor={totales.kcal} unidad="kcal consumidas" />
        {resto && (resto.kcal !== null ? <Metric size="title" align="right" valor={resto.kcal} unidad="kcal" label={resto.rotulo} /> : <p className="text-body-sm text-fg-muted">{resto.rotulo}</p>)}
      </div>
      <ProgressBar value={totales.kcal} goal={objetivos.kcal} size="lg" colorClass={MACROS.kcal.bg} label={MACROS.kcal.label}
        valueText={`${formatInt(totales.kcal)} de ${formatInt(objetivos.kcal)} kcal${frase ? `. ${frase}` : ''}`} />
      <div className="nutrition-macros grid grid-cols-3 gap-stack">
        {CARRILES.map(({ macro, nombre, valor, objetivo }) => {
          const m = MACROS[macro], v = Math.round(valor(totales)), g = Math.round(objetivo(objetivos)), diff = v - g
          return <div key={macro} className="min-w-0 space-y-1.5">
            <p className="break-words text-caption text-fg-muted">{nombre}</p>
            <p className="tabular flex flex-wrap items-baseline gap-x-1 text-body-sm"><strong className="font-semibold text-fg">{formatInt(v)}</strong><span className="text-caption text-fg-muted">{g > 0 ? `/ ${formatInt(g)} ` : ''}g</span></p>
            <ProgressBar value={valor(totales)} goal={objetivo(objetivos)} colorClass={m.bg} label={m.label}
              valueText={`${formatInt(v)} de ${formatInt(g)} g${g > 0 && diff > 0 ? `, ${formatInt(diff)} g sobre el objetivo` : ''}`} />
          </div>
        })}
      </div>
      {detalle && <Disclosure title="Ver detalle nutricional">{detalle}</Disclosure>}
    </Card>
  </section>
}
