import type { Hito } from './ritmo'

export interface TramoHito {
  semanas: number
  /** Cuándo se llegó (`null` si aún no). */
  fecha: string | null
  estado: 'logrado' | 'siguiente' | 'pendiente'
  /** Parte del tramo desde el hito anterior (o desde 0) que ya está hecha, de 0 a 1. */
  relleno: number
}

/**
 * Los hitos de semanas cumplidas como una pista (punto 20): un tramo por hito, lleno hasta las semanas cumplidas, el
 * primero sin lograr marcado como «siguiente» y cuántas faltan para él (`null` si ya están todos).
 */
export function pistaHitos(hitos: readonly Hito[], cumplidas: number): { tramos: TramoHito[]; siguiente: { semanas: number; faltan: number } | null } {
  let anterior = 0
  let siguiente: { semanas: number; faltan: number } | null = null
  const tramos = hitos.map((h): TramoHito => {
    const relleno = Math.max(0, Math.min(1, (cumplidas - anterior) / (h.semanas - anterior)))
    anterior = h.semanas
    const logrado = h.fecha !== null || cumplidas >= h.semanas
    const estado = logrado ? 'logrado' : siguiente ? 'pendiente' : 'siguiente'
    if (estado === 'siguiente') siguiente = { semanas: h.semanas, faltan: h.semanas - cumplidas }
    return { semanas: h.semanas, fecha: h.fecha, estado, relleno }
  })
  return { tramos, siguiente }
}
