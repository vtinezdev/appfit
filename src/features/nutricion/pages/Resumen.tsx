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
import Card from '../../../shared/components/Card'

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

  const chartData = fechas.map((f, i) => ({
    dia: formatShort(f),
    Kcal: macros[i].kcal,
    Proteína: macros[i].prot,
    Carbohidratos: macros[i].carb,
    Grasa: macros[i].grasa,
  }))

  return (
    <div className="space-y-5 pb-4">
      <SegmentedControl opciones={RANGOS} valor={rango} onChange={cambiarRango} />

      <div className="flex items-center justify-between px-1">
        <IconButton icon="chevron-left" label="Periodo anterior" size="sm" onClick={() => setFechaAncla(desplazarPeriodo(rango, fechaAncla, -1))} />
        <span className="text-body font-semibold capitalize text-fg">{etiquetaPeriodo(rango, fechaAncla)}</span>
        <IconButton icon="chevron-right" label="Periodo siguiente" size="sm" onClick={() => setFechaAncla(desplazarPeriodo(rango, fechaAncla, 1))} disabled={esPeriodoActual(rango, fechaAncla)} />
      </div>

      <Card>
        <h3 className="mb-3 text-body-sm font-semibold text-fg-muted">Kcal por día</h3>
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
            <Bar dataKey="Kcal" fill={chartColors.kcal} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <h3 className="mb-3 text-body-sm font-semibold text-fg-muted">Macros por día (g)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <XAxis dataKey="dia" {...chartAxis} />
            <YAxis {...chartAxis} width={30} />
            <Tooltip {...chartTooltip} />
            <Bar dataKey="Proteína" stackId="m" fill={chartColors.protein} radius={[0, 0, 0, 0]} />
            <Bar dataKey="Carbohidratos" stackId="m" fill={chartColors.carbs} radius={[0, 0, 0, 0]} />
            <Bar dataKey="Grasa" stackId="m" fill={chartColors.fat} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <h3 className="text-body-sm font-semibold text-fg-muted">Media diaria</h3>
          <p className="mb-2 text-caption text-fg-subtle">
            {diasRegistrados === 0 ? 'Sin registros en este periodo' : `De ${diasRegistrados} ${diasRegistrados === 1 ? 'día registrado' : 'días registrados'}`}
          </p>
          <ul className="space-y-1 text-body-sm text-fg-muted">
            <li>Kcal: {formatInt(media.kcal)} / {formatInt(objetivos.kcal)}</li>
            <li>Prot: {formatInt(media.prot)} / {formatInt(objetivos.prot)} g</li>
            <li>Carb: {formatInt(media.carb)} / {formatInt(objetivos.carb)} g</li>
            <li>Grasa: {formatInt(media.grasa)} / {formatInt(objetivos.grasa)} g</li>
          </ul>
        </Card>
        <Card>
          <h3 className="mb-2 text-body-sm font-semibold text-fg-muted">Distribución</h3>
          <ul className="space-y-1 text-body-sm text-fg-muted">
            <li>Proteína: {distribucion.prot}%</li>
            <li>Carbohidratos: {distribucion.carb}%</li>
            <li>Grasa: {distribucion.grasa}%</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
