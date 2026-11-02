import { describe, expect, it } from 'vitest'
import { mesesDelAnio, rayasSemana, semanasDelAnio } from './calendario'

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

  it('rayas de la semana: una por entreno y por día del plan, llenas las hechas sin pasar del plan; sin nutrición, sin comidas', () => {
    const plan = { entrenos: 3, diasRegistro: 5 }
    expect(rayasSemana({ entrenos: 2, diasRegistrados: 6, plan })).toEqual({ entreno: { hechas: 2, total: 3 }, comidas: { hechas: 5, total: 5 } })
    expect(rayasSemana({ entrenos: 4, diasRegistrados: null, plan })).toEqual({ entreno: { hechas: 3, total: 3 }, comidas: null })
    expect(rayasSemana({ entrenos: 0, diasRegistrados: 0, plan: { entrenos: 0, diasRegistro: 5 } })).toEqual({ entreno: { hechas: 1, total: 1 }, comidas: { hechas: 0, total: 5 } })
  })
})
