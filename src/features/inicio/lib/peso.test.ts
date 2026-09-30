import { describe, expect, it } from 'vitest'
import type { Peso } from '../../../shared/db/types'
import { puntosSparkline, tendenciaPeso, validarPeso } from './peso'

const p = (fecha: string, kg: number): Peso => ({ id: 0, fecha, kg, createdAt: 0 })

describe('validarPeso', () => {
  it('redondea a 1 decimal y acepta 20–300', () => {
    expect(validarPeso(72.46)).toBe(72.5)
    expect(validarPeso(20)).toBe(20)
    expect(validarPeso(300)).toBe(300)
  })

  it('rechaza lo fuera de rango o no finito', () => {
    for (const x of [19.9, 300.1, 0, -5, Number.NaN, Infinity]) expect(validarPeso(x), String(x)).toBeNull()
  })
})

describe('tendenciaPeso', () => {
  it('sin pesajes (o solo futuros): null', () => {
    expect(tendenciaPeso([], '2026-09-30')).toBeNull()
    expect(tendenciaPeso([p('2026-10-05', 70)], '2026-09-30')).toBeNull()
  })

  it('variación contra el último pesaje con al menos 7 días de antigüedad', () => {
    const t = tendenciaPeso([p('2026-09-20', 73), p('2026-09-23', 72.4), p('2026-09-24', 72.2), p('2026-09-30', 71.8)], '2026-09-30')
    expect(t).toMatchObject({ actual: 71.8, fecha: '2026-09-30', variacion7d: -0.6 })
  })

  it('sin pesaje de hace 7 días o más no hay variación', () => {
    const t = tendenciaPeso([p('2026-09-25', 72), p('2026-09-30', 71.8)], '2026-09-30')
    expect(t?.variacion7d).toBeNull()
  })

  it('el último pesaje puede ser anterior a hoy: la variación se mide desde su fecha', () => {
    const t = tendenciaPeso([p('2026-09-10', 70), p('2026-09-20', 71)], '2026-09-30')
    expect(t).toMatchObject({ actual: 71, fecha: '2026-09-20', variacion7d: 1 })
  })

  it('la serie son los últimos 30 días, ordenados', () => {
    const t = tendenciaPeso([p('2026-09-30', 71), p('2026-09-01', 72), p('2026-08-31', 99), p('2026-09-15', 71.5)], '2026-09-30')
    expect(t?.serie30d.map((x) => x.fecha)).toEqual(['2026-09-01', '2026-09-15', '2026-09-30'])
  })
})

describe('puntosSparkline', () => {
  it('sin valores: vacío', () => {
    expect(puntosSparkline([], 100, 20)).toBe('')
  })

  it('un valor o todos iguales: línea horizontal a media altura', () => {
    expect(puntosSparkline([70], 100, 20)).toBe('M0 10 L100 10')
    expect(puntosSparkline([70, 70, 70], 100, 20)).toBe('M0 10 L100 10')
  })

  it('reparte x a intervalos iguales y pone el mayor arriba', () => {
    expect(puntosSparkline([70, 72, 71], 100, 20)).toBe('M0 20 L50 0 L100 10')
  })
})
