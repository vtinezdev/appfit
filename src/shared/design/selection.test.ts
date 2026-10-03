import { describe, expect, it } from 'vitest'
import { indicePorTecla } from './selection'

describe('teclado de opciones exclusivas', () => {
  it.each([
    ['ArrowRight', 0, 4, 1], ['ArrowRight', 3, 4, 0],
    ['ArrowLeft', 0, 4, 3], ['ArrowLeft', 2, 4, 1],
    ['ArrowDown', 3, 4, 0], ['ArrowUp', 0, 4, 3],
    ['Home', 2, 4, 0], ['End', 0, 4, 3],
    ['ArrowRight', 0, 1, 0], ['ArrowLeft', 0, 1, 0],
    ['Tab', 0, 4, null], ['Enter', 0, 4, null],
    ['Escape', 0, 4, null], ['Home', 0, 0, null],
  ])('%s desde %i entre %i opciones', (key, current, total, expected) => {
    expect(indicePorTecla(key as string, current as number, total as number)).toBe(expected)
  })
})
