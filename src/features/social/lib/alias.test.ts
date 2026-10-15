import { describe, expect, it } from 'vitest'
import { esCodigo, limpiarNombre, normalizarAlias, textoBusqueda, validarAlias, validarNombre } from './alias'

describe('alias', () => {
  it('se normaliza como en el servidor', () => {
    expect(normalizarAlias('  @Ana.Fit ')).toBe('ana.fit')
  })

  it('acepta letras, números, punto y guion bajo', () => {
    expect(validarAlias('ana.fit_92')).toBeNull()
    expect(validarAlias('ANA')).toBeNull()
    expect(validarAlias('_ab')).toBeNull()
  })

  it('rechaza lo que el servidor no acepta', () => {
    expect(validarAlias('ab')).toMatch(/de 3 a 20/)
    expect(validarAlias('a'.repeat(21))).toMatch(/de 3 a 20/)
    expect(validarAlias('.ana')).toMatch(/sin empezar ni acabar en punto/)
    expect(validarAlias('ana.')).toMatch(/punto/)
    expect(validarAlias('maría')).toMatch(/sin tildes/)
    expect(validarAlias('ana fit')).toMatch(/sin tildes/)
  })
})

describe('nombre', () => {
  it('es opcional y sin espacios de más', () => {
    expect(limpiarNombre('   ')).toBeNull()
    expect(limpiarNombre('  Ana   G. ')).toBe('Ana G.')
    expect(validarNombre('')).toBeNull()
  })

  it('como mucho 40 caracteres', () => {
    expect(validarNombre('a'.repeat(40))).toBeNull()
    expect(validarNombre('a'.repeat(41))).toMatch(/40/)
  })
})

describe('búsqueda', () => {
  it('distingue un código de invitación de un alias', () => {
    expect(esCodigo('1A2B-3C4D')).toBe(true)
    expect(esCodigo('1a2b3c4d')).toBe(true)
    expect(esCodigo('ana.fit')).toBe(false)
  })

  it('normaliza el alias y deja el código tal cual', () => {
    expect(textoBusqueda(' @Ana ')).toBe('ana')
    expect(textoBusqueda(' 1a2b-3c4d ')).toBe('1a2b-3c4d')
    expect(textoBusqueda('   ')).toBeNull()
  })
})
