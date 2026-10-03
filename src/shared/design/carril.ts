/**
 * Geometría del progreso hacia un objetivo (ProgressBar), sin nada de DOM.
 * El dominio es max(objetivo, valor), así que nada se corta al 100 %. Todo son fracciones 0–1 de ese dominio:
 * - `relleno`: lo conseguido hasta la meta (si te pasas, llega justo a la meta).
 * - `exceso`: lo que pasa de la meta (se dibuja atenuado, sin alarmas).
 * - `meta`: posición de la marca de objetivo; `null` si no hay objetivo.
 */
export interface TramosCarril {
  relleno: number
  exceso: number
  meta: number | null
}

export function tramosCarril(valor: number, objetivo: number): TramosCarril {
  const v = Number.isFinite(valor) ? Math.max(valor, 0) : 0
  const g = Number.isFinite(objetivo) ? Math.max(objetivo, 0) : 0
  const hayMeta = g > 0
  const dominio = Math.max(g, v, 1)
  const pasa = hayMeta && v > g
  return {
    relleno: (pasa ? g : v) / dominio,
    exceso: pasa ? (v - g) / dominio : 0,
    meta: hayMeta ? g / dominio : null,
  }
}
