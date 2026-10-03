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
  seriesSecondary: rgb('text-primary'),
  seriesTertiary: rgb('accent'),
}

export const chartAxis = { stroke: chartColors.axis, fontSize: 12, tickLine: false, axisLine: false } as const

export const chartTooltip = {
  // Tooltip invertido respecto al tema, igual que los avisos temporales.
  contentStyle: {
    background: rgb('text-primary'),
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: 12,
    boxShadow: 'var(--shadow-overlay)',
  },
  labelStyle: { color: rgb('bg'), fontWeight: 600 },
  itemStyle: { color: rgb('bg') },
  cursor: { fill: rgb('surface-muted') },
} as const

/** Línea de objetivo: la misma marca en todas las gráficas. */
export const chartGoalLine = { stroke: chartColors.goal, strokeDasharray: '4 4', strokeOpacity: 0.6 } as const
