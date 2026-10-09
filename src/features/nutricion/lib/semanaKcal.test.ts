import { describe, expect, it } from 'vitest'
import { semanaKcal } from './semanaKcal'

describe('semanaKcal', () => {
  const entries = [{ fecha: '2026-10-05', kcal: 1000 }, { fecha: '2026-10-05', kcal: 1200 }, { fecha: '2026-10-07', kcal: 2750 }, { fecha: '2026-10-12', kcal: 900 }]
  const objetivos = new Map([['2026-10-05', { kcal: 2000 }], ['2026-10-06', { kcal: 2000 }], ['2026-10-07', { kcal: 2500 }], ['2026-10-09', { kcal: 2200 }], ['2026-10-10', { kcal: 2200 }]])
  const semana = semanaKcal('2026-10-09', entries, objetivos, '2026-10-09')

  it('lunes a domingo con su letra y número', () => {
    expect(semana.map(d => d.letra).join('')).toBe('LMXJVSD')
    expect(semana[0]).toMatchObject({ fecha: '2026-10-05', numero: 5 })
    expect(semana[6].fecha).toBe('2026-10-11')
  })
  it('suma las kcal del día y escala barras y objetivos con el mayor valor de la semana', () => {
    expect(semana[0]).toMatchObject({ kcal: 2200, objetivo: 2000 })
    expect(semana[2].alto).toBeCloseTo(1 / 1.15, 3)
    expect(semana[0].alto).toBeCloseTo(2200 / (2750 * 1.15), 3)
    expect(semana[0].meta).toBeCloseTo(2000 / (2750 * 1.15), 3)
    // Sin objetivo ese día: sin línea.
    expect(semana[3]).toMatchObject({ kcal: 0, objetivo: 0, meta: null })
  })
  it('los días futuros no tienen objetivo y se marcan; hoy también', () => {
    expect(semana[4]).toMatchObject({ hoy: true, futuro: false })
    expect(semana[5]).toMatchObject({ futuro: true, objetivo: 0, meta: null })
  })
})
