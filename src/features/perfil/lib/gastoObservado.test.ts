import { describe, expect, it } from 'vitest'
import { addDays } from '../../../shared/lib/dates'
import { calcularGastoObservado, pendiente } from './gastoObservado'

const HOY = '2026-10-29'
const INICIO = addDays(HOY, -28)
const dias = (n: number) => Array.from({ length: n }, (_, i) => addDays(INICIO, i))

function datos(kcal: number, kgInicial: number, kgPorDia: number, pesajesPorSemana = 3) {
  const kcalPorDia = new Map(dias(28).map((f) => [f, kcal] as const))
  const pesos: { fecha: string; kg: number }[] = []
  for (let i = -7; i < 28; i++) {
    if (i % Math.floor(7 / pesajesPorSemana) === 0 || pesajesPorSemana >= 7) pesos.push({ fecha: addDays(INICIO, i), kg: kgInicial + kgPorDia * i })
  }
  return { kcalPorDia, pesos }
}

describe('pendiente', () => {
  it('ajusta una recta', () => {
    expect(pendiente([{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }])).toBeCloseTo(2)
  })
  it('sin puntos suficientes o sin variación devuelve null', () => {
    expect(pendiente([{ x: 0, y: 1 }])).toBeNull()
    expect(pendiente([{ x: 1, y: 1 }, { x: 1, y: 2 }])).toBeNull()
  })
})

describe('calcularGastoObservado', () => {
  it('peso estable: el gasto es lo que comes', () => {
    const r = calcularGastoObservado({ hoy: HOY, ...datos(2500, 75, 0) })
    expect(r).toMatchObject({ estado: 'ok', gasto: 2500, diasRegistrados: 28 })
  })
  it('peso bajando 0,5 kg a la semana: gastas más de lo que comes', () => {
    const r = calcularGastoObservado({ hoy: HOY, ...datos(2500, 75, -0.5 / 7) })
    expect(r.estado).toBe('ok')
    if (r.estado === 'ok') {
      expect(r.kgSemana).toBeCloseTo(-0.5, 1)
      expect(r.gastoExacto).toBeGreaterThan(3000)
      expect(r.gastoExacto).toBeLessThan(3100)
    }
  })
  it('peso subiendo: gastas menos de lo que comes', () => {
    const r = calcularGastoObservado({ hoy: HOY, ...datos(3000, 75, 0.25 / 7) })
    if (r.estado !== 'ok') throw new Error('debería calcularse')
    expect(r.gastoExacto).toBeLessThan(3000)
  })
  it('con menos del 80 % de días registrados no se calcula y lo dice', () => {
    const d = datos(2500, 75, 0)
    const kcalPorDia = new Map([...d.kcalPorDia].slice(0, 20))
    const r = calcularGastoObservado({ hoy: HOY, kcalPorDia, pesos: d.pesos })
    expect(r.estado).toBe('insuficiente')
    if (r.estado === 'insuficiente') expect(r.motivos.join(' ')).toMatch(/comidas registradas/)
  })
  it('con menos de 2 pesajes por semana no se calcula', () => {
    const r = calcularGastoObservado({ hoy: HOY, ...datos(2500, 75, 0, 1) })
    expect(r.estado).toBe('insuficiente')
    if (r.estado === 'insuficiente') expect(r.motivos.join(' ')).toMatch(/pesajes/)
  })
  it('sin datos: insuficiente con los dos motivos', () => {
    const r = calcularGastoObservado({ hoy: HOY, kcalPorDia: new Map(), pesos: [] })
    expect(r.estado).toBe('insuficiente')
    if (r.estado === 'insuficiente') expect(r.motivos).toHaveLength(2)
  })
  it('el día en curso no cuenta y la ventana nunca baja de 21 días', () => {
    const r = calcularGastoObservado({ hoy: HOY, ...datos(2500, 75, 0), dias: 10 })
    expect(r).toMatchObject({ dias: 21 })
  })
})
