import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { chartAxis, chartColors, chartGrid, chartTooltip, escalaAjustada } from '../design/chart'
import { formatShort, parseISODate, toISODate } from '../lib/dates'
import { formatCompact, formatNumber } from '../lib/format'
import { diasTendencia, type PuntoTendencia } from '../lib/tendencias'

export default function GraficaTendencia({ puntos, unidad, diaria }: { puntos: PuntoTendencia[]; unidad: string; diaria: boolean }) {
  const datos = (diaria ? diasTendencia(puntos) : puntos).map(p => ({ ...p, tiempo: parseISODate(p.fecha).getTime() }))
  const escala = escalaAjustada(puntos.map(p => p.valor))
  const fecha = (t: number) => formatShort(toISODate(new Date(t)))
  return <ResponsiveContainer width="100%" height={200}>
    <LineChart data={datos} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
      <CartesianGrid {...chartGrid} />
      <XAxis dataKey="tiempo" type="number" scale="time" domain={['dataMin', 'dataMax']} {...chartAxis} minTickGap={24} tickFormatter={fecha} />
      <YAxis {...chartAxis} domain={escala.dominio} ticks={escala.marcas} width={48} tickFormatter={v => formatCompact(Number(v))} />
      <Tooltip {...chartTooltip} labelFormatter={v => fecha(Number(v))} formatter={v => [`${formatNumber(Number(v), unidad === 'ml' ? 0 : 1)} ${unidad}`, 'Registrado']} />
      <Line type="linear" dataKey="valor" stroke={chartColors.seriesPrimary} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
    </LineChart>
  </ResponsiveContainer>
}
