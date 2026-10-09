import type { Peso } from '../../../shared/db/types'
import { parseISODate } from '../../../shared/lib/dates'

export interface MiniGrafica {
  /** Trazo SVG en un lienzo de `ancho` × `alto`. */
  d: string
  ultimo: { x: number; y: number }
}

const DIA_MS = 86_400_000

/**
 * Minigráfica de los últimos `n` pesajes hasta hoy: x por fecha real (no por índice, para no esconder huecos) e y ceñida
 * a su mínimo y máximo con un margen para el punto final. Con menos de dos pesajes no hay gráfica.
 */
export function miniGraficaPeso(pesos: Pick<Peso, 'fecha' | 'kg'>[], hoy: string, { n = 12, ancho = 100, alto = 32, margen = 3 } = {}): MiniGrafica | null {
  const puntos = pesos.filter(p => p.fecha <= hoy).sort((a, b) => (a.fecha < b.fecha ? -1 : 1)).slice(-n)
  if (puntos.length < 2) return null
  const t = puntos.map(p => parseISODate(p.fecha).getTime() / DIA_MS)
  const kgs = puntos.map(p => p.kg)
  const [t0, t1] = [t[0], t[t.length - 1]]
  const [min, max] = [Math.min(...kgs), Math.max(...kgs)]
  const x = (v: number) => margen + ((v - t0) / (t1 - t0)) * (ancho - 2 * margen)
  const y = (kg: number) => (max === min ? alto / 2 : margen + ((max - kg) / (max - min)) * (alto - 2 * margen))
  const xy = puntos.map((p, i) => [Math.round(x(t[i]) * 10) / 10, Math.round(y(p.kg) * 10) / 10] as const)
  return { d: xy.map(([px, py], i) => `${i ? 'L' : 'M'}${px} ${py}`).join(''), ultimo: { x: xy[xy.length - 1][0], y: xy[xy.length - 1][1] } }
}
