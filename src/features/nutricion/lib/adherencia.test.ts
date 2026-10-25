import { describe, expect, it } from 'vitest'
import type { Entry } from '../../../shared/db/types'
import { agruparAlimentos, calcularAdherencia, calcularRachas, topAlimentos } from './adherencia'

describe('calcularAdherencia', () => {
  const fechas = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09']
  const kcal = new Map([['2026-10-05', 2000], ['2026-10-06', 2200], ['2026-10-07', 1700], ['2026-10-08', 2300]])
  it('cuenta solo días registrados y no futuros; ±10 % del objetivo de cada día', () => {
    const r = calcularAdherencia(fechas, '2026-10-07', kcal, () => 2000)
    // 05: 2000 ok · 06: 2200 (justo +10 %) ok · 07: 1700 fuera · 08 futuro · 09 sin registro
    expect(r).toEqual({ diasRegistrados: 3, diasEnRango: 2, porcentaje: 67 })
  })
  it('usa el objetivo de cada día', () => {
    const r = calcularAdherencia(['2026-10-05', '2026-10-06'], '2026-10-07', kcal, (f) => (f === '2026-10-05' ? 1000 : 2200))
    expect(r.diasEnRango).toBe(1)
  })
  it('sin registros no hay porcentaje', () => {
    expect(calcularAdherencia(fechas, '2026-10-07', new Map(), () => 2000)).toEqual({ diasRegistrados: 0, diasEnRango: 0, porcentaje: null })
  })
  it('un objetivo 0 nunca cuenta como en rango', () => {
    expect(calcularAdherencia(['2026-10-05'], '2026-10-07', kcal, () => 0).diasEnRango).toBe(0)
  })
})

describe('calcularRachas', () => {
  it('la racha actual llega hasta hoy o, si hoy aún no hay registro, hasta ayer', () => {
    expect(calcularRachas(['2026-10-05', '2026-10-06', '2026-10-07'], '2026-10-07')).toEqual({ actual: 3, mejor: 3 })
    expect(calcularRachas(['2026-10-05', '2026-10-06'], '2026-10-07')).toEqual({ actual: 2, mejor: 2 })
  })
  it('un día sin registrar antes de ayer la rompe; la mejor se conserva', () => {
    expect(calcularRachas(['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-10-06'], '2026-10-07')).toEqual({ actual: 1, mejor: 4 })
    expect(calcularRachas(['2026-10-01'], '2026-10-07')).toEqual({ actual: 0, mejor: 1 })
  })
  it('sin fechas y con repetidas', () => {
    expect(calcularRachas([], '2026-10-07')).toEqual({ actual: 0, mejor: 0 })
    expect(calcularRachas(['2026-10-07', '2026-10-07'], '2026-10-07')).toEqual({ actual: 1, mejor: 1 })
  })
  it('cruza meses y años', () => {
    expect(calcularRachas(['2025-12-31', '2026-01-01'], '2026-01-01').actual).toBe(2)
  })
})

const e = (id: number, over: Partial<Entry>): Entry => ({ id, fecha: '2026-10-05', comida: 'comida', nombre: 'X', gramos: 100, kcal: 100, prot: 10, carb: 0, grasa: 0, createdAt: id, ...over })

describe('agruparAlimentos y topAlimentos', () => {
  const entries = [
    e(1, { foodId: 1, nombre: 'Pollo, pechuga cruda', kcal: 120, prot: 23 }),
    e(2, { foodId: 1, nombre: 'Pollo, pechuga cruda', kcal: 240, prot: 46, gramos: 200 }),
    e(3, { catalogId: 'ciqual:1', nombre: 'Arroz blanco cocido', kcal: 500, prot: 8 }),
    e(4, { rapida: true, nombre: 'Comida fuera', kcal: 900, prot: 0, gramos: 0 }),
    e(5, { nombre: 'Sin referencia', kcal: 300, prot: 5 }),
    e(6, { foodId: 2, nombre: 'Almendras', kcal: 600, prot: 21 }),
  ]
  it('agrupa por referencia y deja fuera rápidas y entradas sin referencia', () => {
    const g = agruparAlimentos(entries)
    expect(g.map((a) => a.clave).sort()).toEqual(['catalog:ciqual:1', 'user:1', 'user:2'])
    expect(g.find((a) => a.clave === 'user:1')).toMatchObject({ kcal: 360, prot: 69, gramos: 300, veces: 2, nombre: 'Pollo' })
  })
  it('top por kcal y por proteína, con nombre personal si existe', () => {
    const g = agruparAlimentos(entries, new Map([['user:2', 'Mis almendras']]))
    expect(topAlimentos(g, 'kcal', 2).map((a) => a.nombre)).toEqual(['Mis almendras', 'Arroz'])
    expect(topAlimentos(g, 'prot').map((a) => a.nombre)).toEqual(['Pollo', 'Mis almendras', 'Arroz'])
  })
  it('limita a 5 y descarta valores 0', () => {
    const muchos = Array.from({ length: 8 }, (_, i) => e(i + 1, { foodId: i + 1, nombre: `Alimento ${i}`, kcal: 100 + i, prot: 0 }))
    expect(topAlimentos(agruparAlimentos(muchos), 'kcal')).toHaveLength(5)
    expect(topAlimentos(agruparAlimentos(muchos), 'prot')).toEqual([])
  })
})
