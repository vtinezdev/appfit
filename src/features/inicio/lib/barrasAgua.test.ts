import { describe, expect, it } from 'vitest'
import { barrasAgua } from './barrasAgua'

describe('barrasAgua', () => {
  it('una barra por día hasta hoy, con huecos a cero y la escala en el máximo', () => {
    const r = barrasAgua([{ fecha: '2026-10-25', ml: 2500 }, { fecha: '2026-10-27', ml: 1000 }], '2026-10-27', 3, 2000)
    expect(r.barras.map((b) => [b.fecha, b.ml])).toEqual([['2026-10-25', 2500], ['2026-10-26', 0], ['2026-10-27', 1000]])
    expect(r.barras.map((b) => b.alto)).toEqual([1, 0, 0.4])
    expect(r.lineaObjetivo).toBe(0.8)
    expect(r.media).toBe(1750)
    expect(r).toMatchObject({ diasConRegistro: 2, diasEnObjetivo: 1 })
  })

  it('el objetivo marca la escala si nadie lo alcanza; sin objetivo no hay línea', () => {
    expect(barrasAgua([{ fecha: '2026-10-27', ml: 500 }], '2026-10-27', 1, 2000).barras[0].alto).toBe(0.25)
    const sin = barrasAgua([], '2026-10-27', 7, null)
    expect(sin).toMatchObject({ lineaObjetivo: null, media: null, diasConRegistro: 0, diasEnObjetivo: 0 })
    expect(sin.barras).toHaveLength(7)
  })
})
