import { addDays } from './dates'

export type PeriodoTendencia = '7' | '30' | '90' | 'todo'
export interface PuntoTendencia { fecha: string; valor: number }

/** No modifica datos, no convierte días sin registro en cero y excluye fechas futuras. */
export function puntosTendencia(puntos: readonly PuntoTendencia[], periodo: PeriodoTendencia, hoy: string): PuntoTendencia[] {
  const desde = periodo === 'todo' ? '' : addDays(hoy, 1 - Number(periodo))
  const porFecha = new Map<string, PuntoTendencia>()
  for (const punto of puntos) {
    if (punto.fecha >= desde && punto.fecha <= hoy && Number.isFinite(punto.valor) && punto.valor >= 0) porFecha.set(punto.fecha, { ...punto })
  }
  return [...porFecha.values()].sort((a, b) => a.fecha.localeCompare(b.fecha))
}

/** Para registros diarios, un hueco interrumpe la línea en lugar de inventar consumo. */
export function diasTendencia(puntos: readonly PuntoTendencia[]): { fecha: string; valor: number | null }[] {
  if (!puntos.length) return []
  const porFecha = new Map(puntos.map(p => [p.fecha, p.valor]))
  const resultado = []
  for (let fecha = puntos[0].fecha; fecha <= puntos[puntos.length - 1].fecha; fecha = addDays(fecha, 1)) resultado.push({ fecha, valor: porFecha.get(fecha) ?? null })
  return resultado
}
