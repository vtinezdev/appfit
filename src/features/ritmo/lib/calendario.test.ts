import { describe, expect, it } from 'vitest'
import { mesesDelAnio, partesSemana, semanasDelAnio } from './calendario'

describe('calendario de semanas', () => {
  it('las semanas de un año empiezan en su primer lunes', () => {
    const s = semanasDelAnio(2026)
    expect(s[0]).toBe('2026-01-05')
    expect(s).toHaveLength(52)
    expect(s.at(-1)).toBe('2026-12-28')
  })

  it('por meses: cada semana en el mes de su lunes; el año en curso, hasta el mes de hoy', () => {
    const meses = mesesDelAnio(2026, '2026-10-27')
    expect(meses).toHaveLength(10)
    expect(meses[0].semanas).toEqual(['2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26'])
    expect(meses[9].semanas).toEqual(['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'])
    expect(mesesDelAnio(2025, '2026-10-27')).toHaveLength(12)
    expect(mesesDelAnio(2025, '2026-10-27').flatMap((m) => m.semanas)).toEqual(semanasDelAnio(2025))
  })

  it('partes de la semana: lo hecho frente al plan, sin pasar de 1; sin nutrición, sin mitad de comidas', () => {
    const plan = { entrenos: 3, diasRegistro: 5 }
    expect(partesSemana({ entrenos: 2, diasRegistrados: 6, plan })).toEqual({ entreno: 2 / 3, comidas: 1 })
    expect(partesSemana({ entrenos: 4, diasRegistrados: null, plan })).toEqual({ entreno: 1, comidas: null })
    expect(partesSemana({ entrenos: 0, diasRegistrados: 0, plan: { entrenos: 0, diasRegistro: 5 } })).toEqual({ entreno: 1, comidas: 0 })
  })
})
