import { describe, expect, it } from 'vitest'
import { formatAgua, objetivoAguaPorDefecto, partesAgua, resolverObjetivoAgua, validarObjetivoAgua, validarTomaAgua } from './agua'

describe('objetivo de agua', () => {
  it('por defecto: 2,0 L hombres y 1,6 L mujeres (EFSA descontando alimentos); sin sexo, ninguno', () => {
    expect(objetivoAguaPorDefecto('hombre')).toBe(2000)
    expect(objetivoAguaPorDefecto('mujer')).toBe(1600)
    expect(objetivoAguaPorDefecto(undefined)).toBeNull()
  })
  it('lo editado manda sobre el recomendado', () => {
    expect(resolverObjetivoAgua(2500, 'mujer')).toEqual({ ml: 2500, origen: 'ajustes' })
    expect(resolverObjetivoAgua(undefined, 'mujer')).toEqual({ ml: 1600, origen: 'efsa' })
    expect(resolverObjetivoAgua(undefined, undefined)).toBeNull()
    // un valor guardado inválido se ignora
    expect(resolverObjetivoAgua(50, 'hombre')).toEqual({ ml: 2000, origen: 'efsa' })
    // el ajuste sirve aunque no haya sexo
    expect(resolverObjetivoAgua(2200, undefined)).toEqual({ ml: 2200, origen: 'ajustes' })
  })
})

describe('validaciones y formato', () => {
  it('toma 1–5.000 ml', () => {
    expect(validarTomaAgua(330)).toBe(330)
    expect(validarTomaAgua(0)).toBeNull()
    expect(validarTomaAgua(6000)).toBeNull()
    expect(validarTomaAgua(NaN)).toBeNull()
  })
  it('objetivo 500–8.000 ml a pasos de 50', () => {
    expect(validarObjetivoAgua(1980)).toBe(2000)
    expect(validarObjetivoAgua(100)).toBeNull()
    expect(validarObjetivoAgua(9000)).toBeNull()
  })
  it('formatea ml y litros', () => {
    expect(formatAgua(250)).toBe('250 ml')
    expect(formatAgua(1500)).toBe('1,5 L')
    expect(formatAgua(2000)).toBe('2 L')
    expect(partesAgua(1250)).toEqual({ valor: '1,25', unidad: 'L' })
    expect(partesAgua(0)).toEqual({ valor: '0', unidad: 'ml' })
  })
})
