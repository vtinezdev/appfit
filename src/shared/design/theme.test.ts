import { describe, expect, it } from 'vitest'
import { fondoDe } from './theme'

describe('fondoDe', () => {
  it('las curvas son el fondo por defecto; lo guardado elige foto, liso o puntos', () => {
    expect(fondoDe(null)).toBe('curvas')
    expect(fondoDe('otro')).toBe('curvas')
    expect(fondoDe('foto')).toBe('foto')
    expect(fondoDe('liso')).toBe('liso')
    expect(fondoDe('puntos')).toBe('puntos')
  })
})
