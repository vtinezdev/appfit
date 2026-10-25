import { describe, expect, it } from 'vitest'
import { medidasDeBorrador, resumenMedidas, validarMedida } from './medidas'

describe('validarMedida', () => {
  it('acepta rangos plausibles y redondea a 1 decimal', () => {
    expect(validarMedida('cintura', 82.46)).toBe(82.5)
    expect(validarMedida('grasaPct', 18)).toBe(18)
  })
  it.each([['cintura', 5], ['cintura', 400], ['grasaPct', 1], ['grasaPct', 80], ['brazo', NaN]] as const)('rechaza %s = %s', (c, v) => expect(validarMedida(c, v)).toBeNull())
})

describe('medidasDeBorrador', () => {
  it('ignora campos vacíos y acepta coma decimal', () => {
    expect(medidasDeBorrador({ cintura: '82,5', pecho: '  ', grasaPct: '18' })).toEqual({ valores: { cintura: 82.5, grasaPct: 18 } })
  })
  it('error si no hay ninguna o alguna es inválida', () => {
    expect(medidasDeBorrador({})).toEqual({ error: 'Rellena al menos una medida.' })
    expect(medidasDeBorrador({ cintura: '5' })).toMatchObject({ error: expect.stringContaining('Cintura') })
    expect(medidasDeBorrador({ muslo: 'abc' })).toMatchObject({ error: expect.stringContaining('Muslo') })
  })
})

describe('resumenMedidas', () => {
  const medidas = [
    { fecha: '2026-09-01', cintura: 84, brazo: 35 },
    { fecha: '2026-10-01', cintura: 82.5 },
    { fecha: '2026-09-15', cintura: 83, grasaPct: 20 },
  ]
  it('cada campo se compara con su propio historial', () => {
    const r = Object.fromEntries(resumenMedidas(medidas).map((c) => [c.campo, c]))
    expect(r.cintura).toMatchObject({ ultimo: { fecha: '2026-10-01', valor: 82.5 }, variacion: -0.5 })
    expect(r.brazo).toMatchObject({ ultimo: { fecha: '2026-09-01', valor: 35 }, variacion: null })
    expect(r.grasaPct.ultimo?.valor).toBe(20)
    expect(r.cadera).toMatchObject({ ultimo: null, variacion: null })
  })
  it('sin medidas, todo vacío', () => {
    expect(resumenMedidas([]).every((c) => c.ultimo === null)).toBe(true)
  })
})
