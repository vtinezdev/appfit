import { describe, expect, it } from 'vitest'
import { formatCompact, formatInt, formatNumber } from './format'

describe('cifras de interfaz', () => {
  it('mantiene millares y decimales españoles en métricas', () => {
    expect(formatInt(12345.6)).toBe('12.346')
    expect(formatNumber(12345.6, 1)).toBe('12.345,6')
  })
  it.each([0, 250, 999, 1200, 999999, 12345678, 1234567890])('el eje compacto contiene %s sin una etiqueta desbordante', n => {
    expect(formatCompact(n).length).toBeLessThanOrEqual(8)
    expect(formatCompact(n)).not.toContain('e+')
  })
  it('expresa millones y no modifica el formato completo', () => {
    expect(formatCompact(12345678)).toBe('12,3\u00a0M')
    expect(formatInt(12345678)).toBe('12.345.678')
  })
  it.each([NaN, Infinity, -Infinity])('normaliza valores no finitos', n => expect(formatCompact(n)).toBe('0'))
})
