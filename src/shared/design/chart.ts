/**
 * Estilo de gráficas (Recharts). Los colores son referencias a tokens CSS, así que cambian solos con el tema
 * y ningún componente escribe un color a mano.
 */
const rgb = (token: string) => `rgb(var(--c-${token}))`

export const chartColors = {
  kcal: rgb('kcal'),
  protein: rgb('protein'),
  carbs: rgb('carbs'),
  fat: rgb('fat'),
  goal: rgb('goal'),
  axis: rgb('text-tertiary'),
  // Series de gym (no son datos nutricionales)
  seriesPrimary: rgb('accent'),
  seriesSecondary: rgb('success'),
  seriesTertiary: rgb('warning'),
}

export const chartAxis = { stroke: chartColors.axis, fontSize: 11, tickLine: false, axisLine: false } as const

export const chartTooltip = {
  contentStyle: {
    background: rgb('surface-elevated'),
    border: `1px solid ${rgb('border')}`,
    borderRadius: 'var(--radius-sm)',
    fontSize: 12,
    boxShadow: 'var(--shadow-raised)',
  },
  labelStyle: { color: rgb('text-primary') },
  itemStyle: { color: rgb('text-secondary') },
  cursor: { fill: rgb('surface-muted') },
} as const

/** Línea de objetivo: la misma marca en todas las gráficas. */
export const chartGoalLine = { stroke: chartColors.goal, strokeDasharray: '4 4', strokeOpacity: 0.6 } as const
