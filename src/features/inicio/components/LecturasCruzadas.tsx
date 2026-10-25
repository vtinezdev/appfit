import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Card from '../../../shared/components/Card'
import { chartAxis, chartColors, chartGrid, chartTooltip, escalaAjustada } from '../../../shared/design/chart'
import { formatDiaMes, parseISODate } from '../../../shared/lib/dates'
import { formatCompact, formatInt, formatNumber } from '../../../shared/lib/format'
import { frasesCruzadas, type Lecturas, type SemanaCruzada } from '../lib/lecturasCruzadas'

/**
 * «Tus 8 semanas» (B11) al final de la revisión semanal: peso medio (línea, eje izquierdo) y kcal al día (barras, eje
 * derecho) por semana y frases que describen lo que pasó a la vez, nunca por qué. Va en su propio trozo (Recharts).
 */
export default function LecturasCruzadas({ semanas, usa }: { semanas: SemanaCruzada[]; usa: Lecturas }) {
  const frases = frasesCruzadas(semanas, usa)
  const conPeso = usa.peso !== false && semanas.some((s) => s.peso !== null)
  const conKcal = usa.nutricion !== false && semanas.some((s) => s.kcal !== null)
  if (!frases.length && !conPeso && !conKcal) return null
  const datos = semanas.map((s) => ({ semana: formatDiaMes(parseISODate(s.lunes).getTime()), peso: s.peso, kcal: s.kcal }))
  const escalaPeso = escalaAjustada(semanas.flatMap((s) => (s.peso === null ? [] : [s.peso])))
  const resumen = [conPeso && 'peso medio', conKcal && 'kcal al día'].filter(Boolean).join(' y ')

  return (
    <section aria-labelledby="tus-8-semanas" className="space-y-stack">
      <h2 id="tus-8-semanas" className="text-heading text-fg">Tus 8 semanas</h2>
      {(conPeso || conKcal) && <Card className="space-y-2">
        <p className="text-caption text-fg-muted">{resumen.charAt(0).toUpperCase() + resumen.slice(1)} por semana{conPeso && conKcal ? ': el peso en la línea (izquierda) y las kcal en las barras (derecha)' : ''}.</p>
        <div role="img" aria-label={`Gráfica de ${resumen} de las últimas ocho semanas`}>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={datos} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
              <CartesianGrid {...chartGrid} />
              <XAxis dataKey="semana" {...chartAxis} minTickGap={16} />
              {conPeso && <YAxis yAxisId="peso" {...chartAxis} domain={escalaPeso.dominio} ticks={escalaPeso.marcas} width={40} tickFormatter={(v) => formatNumber(Number(v), Number.isInteger(Number(v)) ? 0 : 1)} />}
              {conKcal && <YAxis yAxisId="kcal" orientation="right" {...chartAxis} width={44} tickFormatter={(v) => formatCompact(Number(v))} />}
              <Tooltip {...chartTooltip} formatter={(v, nombre) => (nombre === 'peso' ? [`${formatNumber(Number(v), 1)} kg`, 'Peso medio'] : [`${formatInt(Number(v))} kcal`, 'Kcal al día'])} />
              {conKcal && <Bar yAxisId="kcal" dataKey="kcal" fill={chartColors.seriesSecondary} fillOpacity={0.25} isAnimationActive={false} />}
              {conPeso && <Line yAxisId="peso" type="linear" dataKey="peso" stroke={chartColors.seriesPrimary} strokeWidth={2} dot={{ r: 3 }} connectNulls isAnimationActive={false} />}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>}
      {frases.length > 0
        ? <ul className="space-y-2">{frases.map((f) => <li key={f} className="tabular break-words text-body-sm text-fg">{f}</li>)}</ul>
        : <p className="text-body-sm text-fg-muted">Con 4 semanas o más de registros salen aquí las lecturas que cruzan entreno, comida y peso.</p>}
      <p className="text-caption text-fg-muted">Describen lo que pasó a la vez; no dicen por qué.</p>
    </section>
  )
}
