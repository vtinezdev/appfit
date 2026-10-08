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
  // Texto sobre la serie principal (rótulos): la variante del acento con contraste de texto.
  seriesPrimaryText: rgb('accent-strong'),
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

/** Rejilla horizontal tenue para las líneas: ayuda a leer la escala sin competir con los datos. */
export const chartGrid = { vertical: false, stroke: rgb('border') } as const

/** Paso «redondo» (1, 2 o 5 × 10ⁿ) inmediatamente por encima de `aprox`: sin medios pasos, que el eje compacto («273 mil») redondearía. */
function pasoRedondo(aprox: number): number {
  const base = 10 ** Math.floor(Math.log10(aprox))
  const f = aprox / base
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * base
}

/**
 * Escala del eje Y de una línea: se ciñe a los datos con márgenes redondos (unas cuatro divisiones) y no fuerza el cero,
 * para que el cambio entre sesiones se vea. Las barras conservan el cero, porque su altura es el dato. Nunca baja de 0.
 * Devuelve el dominio y las marcas del eje (de un paso redondo); sin datos, [0, 1].
 */
export function escalaAjustada(valores: number[]): { dominio: [number, number]; marcas: number[] } {
  const v = valores.filter((n) => Number.isFinite(n))
  if (!v.length) return { dominio: [0, 1], marcas: [0, 1] }
  const min = Math.min(...v)
  const max = Math.max(...v)
  const paso = pasoRedondo((max - min) / 4 || Math.max(Math.abs(max) / 4, 1))
  const lo = Math.max(0, Math.floor(min / paso) * paso)
  const hi = Math.max(Math.ceil(max / paso) * paso, lo + paso)
  const marcas = Array.from({ length: Math.round((hi - lo) / paso) + 1 }, (_, i) => Number((lo + i * paso).toFixed(6)))
  return { dominio: [lo, hi], marcas }
}
