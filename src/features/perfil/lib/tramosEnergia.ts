import { formatNumber } from '../../../shared/lib/format'
import { ETIQUETAS_OBJETIVO, formatSigned, METODO_TMB, NIVELES_ACTIVIDAD, type EnergiaOk } from './energia'

/** Qué parte del gasto es: decide su color en la barra y en la leyenda. */
export type EstiloTramo = 'reposo' | 'actividad' | 'observado' | 'superavit' | 'deficit'

export interface TramoBarra { estilo: EstiloTramo; pct: number }
export interface FilaTramo { estilo: EstiloTramo; etiqueta: string; detalle: string; kcal: string }

/**
 * De qué se compone tu energía diaria (punto 9), para una barra y su leyenda: el gasto en reposo y la actividad (o el gasto
 * observado, que no se separa) y el ajuste del objetivo. El superávit se suma al final de la barra; el déficit se marca
 * dentro del gasto, como la parte que no se come. Los anchos suman 100.
 */
export function tramosEnergia(e: EnergiaOk): { barra: TramoBarra[]; filas: FilaTramo[] } {
  const filas: FilaTramo[] = e.origenGet === 'observado'
    ? [{ estilo: 'observado', etiqueta: 'Gasto observado', detalle: `En lugar del estimado (${formatNumber(Math.round(e.getEstimado))} kcal)`, kcal: formatNumber(Math.round(e.get)) }]
    : [
        { estilo: 'reposo', etiqueta: 'En reposo', detalle: `Media de ${formatNumber(METODO_TMB.ecuaciones.length)} ecuaciones`, kcal: formatNumber(Math.round(e.tmb.valor)) },
        { estilo: 'actividad', etiqueta: 'Actividad', detalle: `× ${formatNumber(e.factor, 3)} · ${NIVELES_ACTIVIDAD[e.actividad].etiqueta.toLowerCase()}`, kcal: formatSigned(e.get - e.tmb.valor) },
      ]
  const partes = e.origenGet === 'observado' ? [{ estilo: 'observado' as const, kcal: e.get }]
    : [{ estilo: 'reposo' as const, kcal: e.tmb.valor }, { estilo: 'actividad' as const, kcal: Math.max(0, e.get - e.tmb.valor) }]
  const ajuste = e.ajusteKcal
  if (ajuste !== 0 && e.objetivoAplicado) {
    filas.push({ estilo: ajuste > 0 ? 'superavit' : 'deficit', etiqueta: ETIQUETAS_OBJETIVO[e.objetivoAplicado], detalle: ajuste > 0 ? 'Lo que comes de más' : 'Lo que comes de menos', kcal: formatSigned(ajuste) })
  }
  const total = partes.reduce((t, p) => t + p.kcal, 0) + Math.max(0, ajuste)
  if (total <= 0) return { barra: [], filas }
  const barra: TramoBarra[] = []
  // El déficit sale del final del gasto: se recorta de la última parte (y, si no basta, de las anteriores).
  let quitar = Math.max(0, -ajuste)
  for (let i = partes.length - 1; i >= 0 && quitar > 0; i--) {
    const q = Math.min(quitar, partes[i].kcal)
    partes[i] = { ...partes[i], kcal: partes[i].kcal - q }
    quitar -= q
  }
  for (const p of partes) if (p.kcal > 0) barra.push({ estilo: p.estilo, pct: (p.kcal / total) * 100 })
  if (ajuste !== 0) barra.push({ estilo: ajuste > 0 ? 'superavit' : 'deficit', pct: (Math.abs(ajuste) / total) * 100 })
  return { barra, filas }
}
