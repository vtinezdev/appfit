import type { ConfigCreatina } from '../../../shared/db/types'
import { addDays, diasEntre, parseISODate, toISODate } from '../../../shared/lib/dates'

export const DIAS_CARGA = 5
export function fechaCreatinaValida(fecha: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha) && toISODate(parseISODate(fecha)) === fecha
}
export function dosisManualValida(g: number): boolean { return Number.isFinite(g) && g > 0 }
export function pesoCreatinaValido(kg?: number): kg is number { return kg !== undefined && Number.isFinite(kg) && kg > 0 }

/** Reglas acordadas: manual solo en mantenimiento; la carga siempre se calcula por kg. */
export function diaCreatina(hoy: string, config: ConfigCreatina | undefined, kg?: number) {
  const mantenimiento = config?.dosisManualG !== undefined && dosisManualValida(config.dosisManualG)
    ? config.dosisManualG : pesoCreatinaValido(kg) ? Math.max(3, Math.round(kg * .05 * 2) / 2) : 3
  const inicio = config?.inicioCarga
  const transcurridos = inicio && fechaCreatinaValida(inicio) ? diasEntre(inicio, hoy) : -1
  const carga = transcurridos >= 0 && transcurridos < DIAS_CARGA
  const terminada = transcurridos >= DIAS_CARGA
  return {
    carga, terminada, diaCarga: carga ? transcurridos + 1 : undefined,
    dosisG: carga ? pesoCreatinaValido(kg) ? Math.round(kg * .3 * 100) / 100 : undefined : mantenimiento,
    mantenimientoG: mantenimiento,
    finCarga: inicio && fechaCreatinaValida(inicio) ? addDays(inicio, DIAS_CARGA - 1) : undefined,
  }
}
