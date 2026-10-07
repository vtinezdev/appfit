import { describe, expect, it } from 'vitest'
import { decimalEditable, esDecimalParcial, formatCompact, formatInt, formatNumber, leerDecimal } from './format'

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

describe('campos decimales', () => {
  it('acepta la coma del teclado español y el punto, también a medio escribir', () => {
    expect(leerDecimal('12,5')).toBe(12.5)
    expect(leerDecimal('12.5')).toBe(12.5)
    expect(leerDecimal('12,')).toBe(12)
    expect(leerDecimal(',5')).toBe(0.5)
    expect(leerDecimal('1,05')).toBe(1.05)
    for (const t of ['', ',', ' ']) expect(leerDecimal(t)).toBeUndefined()
  })
  it('rechaza lo que no puede ser una cifra en curso', () => {
    for (const t of ['12,5,', '1.2.3', '-3', '1e3', 'abc']) expect(esDecimalParcial(t)).toBe(false)
    for (const t of ['', '12', '12,', ',5', '0,05']) expect(esDecimalParcial(t)).toBe(true)
  })
  it('muestra el valor editable sin millares y con coma', () => {
    expect(decimalEditable(1234.5)).toBe('1234,5')
    expect(decimalEditable(0)).toBe('0')
    expect(decimalEditable(undefined)).toBe('')
  })
})
