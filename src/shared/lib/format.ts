/** Redondea a 1 decimal. Los valores no finitos (NaN, Infinity) cuentan como 0. */
export function round1(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 10) / 10
}

const formatters = new Map<number, Intl.NumberFormat>()

/**
 * Número para mostrar al usuario: separador de millares SIEMPRE («1.842», «12.500,5»; es-ES lo omite en 4 cifras por defecto)
 * y hasta `maxDecimals` decimales. Regla del Design System: toda métrica numérica que se lee en pantalla
 * (kcal, g, kg, volumen) pasa por aquí; los campos editables y los aria-value* van sin formato.
 */
export function formatNumber(n: number, maxDecimals = 0): string {
  let f = formatters.get(maxDecimals)
  if (!f) {
    f = new Intl.NumberFormat('es-ES', { maximumFractionDigits: maxDecimals, useGrouping: 'always' })
    formatters.set(maxDecimals, f)
  }
  return f.format(Number.isFinite(n) ? n : 0)
}

/** Entero redondeado con separador de millares: «1.842». Atajo de `formatNumber(n)`. */
export function formatInt(n: number): string {
  return formatNumber(n)
}
