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

const compactFormatter = new Intl.NumberFormat('es-ES', { notation: 'compact', maximumSignificantDigits: 3 })

/** Ejes de gráficas estrechas. Métricas, tooltips y datos textuales conservan el valor completo. */
export function formatCompact(n: number): string {
  return compactFormatter.format(Number.isFinite(n) ? n : 0)
}

/** Texto que puede estar a medio escribir en un campo decimal: dígitos y, como mucho, una coma o un punto («», «12,», «,5»). */
export function esDecimalParcial(texto: string): boolean {
  return /^\d*[.,]?\d*$/.test(texto)
}

/** Valor de un campo decimal (coma o punto, como lo teclea el iPhone en español). `undefined` si aún no hay número. */
export function leerDecimal(texto: string): number | undefined {
  const t = texto.trim().replace(',', '.')
  if (!esDecimalParcial(t) || !/\d/.test(t)) return undefined
  return Number(t)
}

/** Un número tal cual se edita: sin millares y con coma decimal («1234,5»). */
export function decimalEditable(n: number | undefined): string {
  return n === undefined || !Number.isFinite(n) ? '' : String(n).replace('.', ',')
}
