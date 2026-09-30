import { useState } from 'react'
import { formatInt } from '../../../shared/lib/format'
import { useLiveQuery } from 'dexie-react-hooks'
import { Bar, BarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import * as entriesRepo from '../data/entriesRepo'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import { getSettings } from '../../../shared/db/settings'
import { desplazarPeriodo, esPeriodoActual, etiquetaPeriodo, fechasPeriodo, formatShort, todayISO } from '../../../shared/lib/dates'
import type { PeriodoRango } from '../../../shared/lib/dates'
import { resumenPeriodo } from '../lib/nutrition'
import { IconButton } from '../../../shared/components/Button'
import { LoadingState } from '../../../shared/components/StateMessage'
import { chartAxis, chartColors, chartGoalLine, chartTooltip } from '../../../shared/design/chart'
import { MACROS } from '../../../shared/design/macros'
import Badge from '../../../shared/components/Badge'
import Card from '../../../shared/components/Card'
import Metric from '../../../shared/components/Metric'
import ProgressBar from '../../../shared/components/ProgressBar'
import SectionHeader from '../../../shared/components/SectionHeader'

const RANGOS: { valor: PeriodoRango; label: string }[] = [
  { valor: 'semana', label: 'Semana' },
  { valor: 'mes', label: 'Mes' },
]

export default function Resumen() {
  const [rango, setRango] = useState<PeriodoRango>('semana')
  const [fechaAncla, setFechaAncla] = useState(todayISO())
  const fechas = fechasPeriodo(rango, fechaAncla)
  const settings = useLiveQuery(() => getSettings(), [])

  function cambiarRango(nuevo: PeriodoRango) {
    setRango(nuevo)
    setFechaAncla(todayISO())
  }

  const entries = useLiveQuery(
    () => entriesRepo.entreFechas(fechas[0], fechas[fechas.length - 1]),
    [fechas.join(',')],
  )

  if (!entries || !settings) {
    return <LoadingState />
  }

  const { porDia: macros, media, diasRegistrados, distribucion } = resumenPeriodo(entries, fechas, todayISO())
  const objetivos = settings.objetivos
  const fraseDias = diasRegistrados === 0 ? 'Sin registros en este periodo' : `De ${diasRegistrados} ${diasRegistrados === 1 ? 'día registrado' : 'días registrados'}`

  const chartData = fechas.map((f, i) => ({
    dia: formatShort(f),
    Kcal: macros[i].kcal,
    Proteína: macros[i].prot,
    Carbohidratos: macros[i].carb,
    Grasa: macros[i].grasa,
  }))

  const medias = [
    { macro: MACROS.prot, valor: media.prot, objetivo: objetivos.prot },
    { macro: MACROS.carbs, valor: media.carb, objetivo: objetivos.carb },
    { macro: MACROS.fat, valor: media.grasa, objetivo: objetivos.grasa },
  ]
  const reparto = [
    { macro: MACROS.prot, pct: distribucion.prot },
    { macro: MACROS.carbs, pct: distribucion.carb },
    { macro: MACROS.fat, pct: distribucion.grasa },
  ]

  return (
    <div className="space-y-section">
      <div className="space-y-stack">
        <SegmentedControl opciones={RANGOS} valor={rango} onChange={cambiarRango} />
        <div className="flex items-center rounded-pill bg-surface shadow-raised">
          <IconButton icon="chevron-left" label="Periodo anterior" variant="ghost" onClick={() => setFechaAncla(desplazarPeriodo(rango, fechaAncla, -1))} />
          <span className="min-w-0 flex-1 truncate text-center text-title capitalize text-fg">{etiquetaPeriodo(rango, fechaAncla)}</span>
          <IconButton icon="chevron-right" label="Periodo siguiente" variant="ghost" onClick={() => setFechaAncla(desplazarPeriodo(rango, fechaAncla, 1))} disabled={esPeriodoActual(rango, fechaAncla)} />
        </div>
      </div>

      <Card tone="ink" role="region" aria-label="Media diaria" className="space-y-4">
        <h2 className="text-label uppercase text-fg-subtle">Media diaria</h2>
        <Metric size="hero" valor={formatInt(media.kcal)} unidad="kcal" caption={`${fraseDias}${objetivos.kcal > 0 ? ` · objetivo ${formatInt(objetivos.kcal)} kcal` : ''}`} />
        <ProgressBar
          size="lg"
          value={media.kcal}
          goal={objetivos.kcal}
          colorClass="bg-kcal"
          label="Media diaria de calorías"
          valueText={`${formatInt(media.kcal)} de ${formatInt(objetivos.kcal)} kcal de media`}
        />
      </Card>

      <section aria-label="Macros medios" className="space-y-stack">
        <SectionHeader variant="section">Macros medios por día</SectionHeader>
        <div className="grid grid-cols-3 gap-4">
          {medias.map(({ macro, valor, objetivo }) => (
            <div key={macro.short} className="min-w-0">
              <Metric size="metric" label={macro.label} valor={formatInt(valor)} unidad="g" caption={`de ${formatInt(objetivo)} g`} />
              <div className="mt-2">
                <ProgressBar value={valor} goal={objetivo} colorClass={macro.bg} label={macro.label} valueText={`${formatInt(valor)} de ${formatInt(objetivo)} g de media`} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Distribución de calorías" className="space-y-stack">
        <SectionHeader variant="section">Distribución</SectionHeader>
        <div className="flex flex-wrap gap-2">
          {reparto.map(({ macro, pct }) => (
            <Badge key={macro.short} dotClass={macro.bg}>
              {macro.label} {formatInt(pct)} %
            </Badge>
          ))}
        </div>
      </section>

      <section aria-label="Kcal por día" className="space-y-stack">
        <SectionHeader variant="section">Kcal por día</SectionHeader>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData}>
            <XAxis dataKey="dia" {...chartAxis} />
            <YAxis
              {...chartAxis}
              width={38}
              tickFormatter={formatInt}
              domain={[0, (dataMax: number) => Math.max(dataMax, objetivos.kcal)]}
            />
            <Tooltip {...chartTooltip} formatter={(v) => formatInt(Number(v))} />
            <ReferenceLine y={objetivos.kcal} {...chartGoalLine} />
            <Bar dataKey="Kcal" fill={chartColors.kcal} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section aria-label="Macros por día" className="space-y-stack">
        <SectionHeader variant="section">Macros por día (g)</SectionHeader>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <XAxis dataKey="dia" {...chartAxis} />
            <YAxis {...chartAxis} width={30} tickFormatter={formatInt} />
            <Tooltip {...chartTooltip} formatter={(v) => formatInt(Number(v))} />
            <Bar dataKey="Proteína" stackId="m" fill={chartColors.protein} radius={[0, 0, 0, 0]} />
            <Bar dataKey="Carbohidratos" stackId="m" fill={chartColors.carbs} radius={[0, 0, 0, 0]} />
            <Bar dataKey="Grasa" stackId="m" fill={chartColors.fat} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </div>
  )
}
