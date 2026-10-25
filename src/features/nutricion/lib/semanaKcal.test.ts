import { describe, expect, it } from 'vitest'
import { fraccionAnillo, semanaKcal } from './semanaKcal'

describe('semanaKcal', () => {
  const entries = [{ fecha: '2026-10-05', kcal: 1000 }, { fecha: '2026-10-05', kcal: 1200 }, { fecha: '2026-10-07', kcal: 2750 }, { fecha: '2026-10-12', kcal: 900 }]
  const objetivos = new Map([['2026-10-05', { kcal: 2000 }], ['2026-10-06', { kcal: 2000 }], ['2026-10-07', { kcal: 2500 }], ['2026-10-09', { kcal: 2200 }], ['2026-10-10', { kcal: 2200 }]])
  const semana = semanaKcal('2026-10-09', entries, objetivos, '2026-10-09')

  it('lunes a domingo con su letra y número', () => {
    expect(semana.map(d => d.letra).join('')).toBe('LMXJVSD')
    expect(semana[0]).toMatchObject({ fecha: '2026-10-05', numero: 5 })
    expect(semana[6].fecha).toBe('2026-10-11')
  })
  it('suma las kcal del día y las compara con su objetivo en el anillo', () => {
    expect(semana[0]).toMatchObject({ kcal: 2200, objetivo: 2000, anillo: 1 })
    expect(semana[2]).toMatchObject({ kcal: 2750, objetivo: 2500, anillo: 1 })
    expect(semana[3]).toMatchObject({ kcal: 0, objetivo: 0, anillo: 0 })
  })
  it('fraccionAnillo: lleno al llegar al objetivo; sin objetivo, lleno si hay registros', () => {
    expect(fraccionAnillo(1100, 2200)).toBe(0.5)
    expect(fraccionAnillo(3000, 2200)).toBe(1)
    expect(fraccionAnillo(800, 0)).toBe(1)
    expect(fraccionAnillo(0, 2200)).toBe(0)
  })
  it('los días futuros no tienen objetivo y se marcan; hoy también', () => {
    expect(semana[4]).toMatchObject({ hoy: true, futuro: false })
    expect(semana[5]).toMatchObject({ futuro: true, objetivo: 0, anillo: 0 })
  })
  it('marca los cheat days sin tocar sus kcal reales', () => {
    expect(semana.every(d => !d.cheat)).toBe(true)
    const conCheat = semanaKcal('2026-10-09', entries, objetivos, '2026-10-09', new Set(['2026-10-07', '2026-10-08']))
    expect(conCheat.filter(d => d.cheat).map(d => d.fecha)).toEqual(['2026-10-07', '2026-10-08'])
    expect(conCheat[2]).toMatchObject({ kcal: 2750, anillo: semana[2].anillo })
  })
})
