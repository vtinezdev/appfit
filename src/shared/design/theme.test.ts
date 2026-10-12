import { describe, expect, it } from 'vitest'
import { fondoDe } from './theme'

describe('fondoDe', () => {
  it('la foto es el fondo por defecto; solo «liso» lo quita', () => {
    expect(fondoDe(null)).toBe('foto')
    expect(fondoDe('otro')).toBe('foto')
    expect(fondoDe('liso')).toBe('liso')
  })
})
