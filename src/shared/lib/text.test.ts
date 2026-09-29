import { describe, expect, it } from 'vitest'
import { normalizeName } from './text'

describe('normalizeName', () => {
  it('quita espacios sobrantes, mayúsculas y tildes', () => {
    expect(normalizeName('  Plátano de Canarias ')).toBe('platano de canarias')
    expect(normalizeName('PIÑA')).toBe('pina')
  })
  it('convierte la ñ en n (solo para comparar y buscar; el nombre mostrado no se normaliza)', () => {
    expect(normalizeName('Ñoquis')).toBe('noquis')
    expect(normalizeName('ñandú')).toBe('nandu')
  })
  it('es idempotente', () => {
    expect(normalizeName(normalizeName(' Ñoquis Café '))).toBe(normalizeName(' Ñoquis Café '))
  })
})
