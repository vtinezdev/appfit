import { describe, expect, it } from 'vitest'
import { normalizeName } from './text'

describe('normalizeName', () => {
  it('quita espacios sobrantes, mayúsculas y tildes', () => {
    expect(normalizeName('  Plátano de Canarias ')).toBe('platano de canarias')
    expect(normalizeName('PIÑA')).toBe('pina')
  })
})
