import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { chartAxis, chartColors, chartTooltip } from '../../../shared/design/chart'
import { formatShort } from '../../../shared/lib/dates'
import { formatCompact, formatNumber } from '../../../shared/lib/format'
import type { PuntoPeso } from '../lib/peso'

/** Pesajes y media móvil de 7 días. Se carga aparte (Recharts no entra en el arranque de Inicio). */
export default function GraficaPeso({ puntos }: { puntos: PuntoPeso[] }) {
  const datos = puntos.map((p) => ({ ...p, dia: formatShort(p.fecha) }))
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-4 text-caption text-fg-muted">
        <span className="flex items-center gap-2"><span aria-hidden className="h-0.5 w-4 bg-fg-subtle" />Pesaje</span>
        <span className="flex items-center gap-2"><span aria-hidden className="h-0.5 w-4 bg-accent" />Media de 7 días</span>
      </div>
      <div role="img" aria-label="Pesajes en kg y media móvil de 7 días. Datos disponibles en la lista inferior.">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={datos} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={chartColors.axis} strokeOpacity={0.2} />
            <XAxis dataKey="dia" {...chartAxis} minTickGap={24} />
            <YAxis {...chartAxis} width={48} domain={['dataMin - 1', 'dataMax + 1']} tickFormatter={(v) => formatCompact(Math.round(Number(v)))} />
            <Tooltip {...chartTooltip} formatter={(v, nombre) => [`${formatNumber(Number(v), 1)} kg`, nombre]} />
            <Line type="linear" dataKey="kg" name="Pesaje" stroke={chartColors.axis} strokeWidth={1.5} dot={{ r: 2 }} isAnimationActive={false} />
            <Line type="linear" dataKey="media" name="Media de 7 días" stroke={chartColors.seriesPrimary} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
