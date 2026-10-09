import { describe, expect, it } from 'vitest'
import { miniGraficaPeso } from './miniGrafica'

describe('miniGraficaPeso', () => {
  it('sin dos pesajes no hay gráfica; los futuros no cuentan', () => {
    expect(miniGraficaPeso([], '2026-10-09')).toBeNull()
    expect(miniGraficaPeso([{ fecha: '2026-10-09', kg: 78 }, { fecha: '2026-10-12', kg: 77 }], '2026-10-09')).toBeNull()
  })
  it('x por fecha real e y ceñida al mínimo y al máximo; el último punto queda marcado', () => {
    const g = miniGraficaPeso([{ fecha: '2026-10-09', kg: 78 }, { fecha: '2026-10-01', kg: 80 }, { fecha: '2026-10-07', kg: 79 }], '2026-10-09', { ancho: 100, alto: 32, margen: 2 })!
    // 1 oct → x 2 (y arriba, el máximo); 7 oct → 6/8 del ancho útil; 9 oct → x 98 (y abajo, el mínimo).
    expect(g.d).toBe('M2 2L74 16L98 30')
    expect(g.ultimo).toEqual({ x: 98, y: 30 })
  })
  it('con el mismo peso la línea va por el centro y usa solo los últimos n', () => {
    const pesos = Array.from({ length: 20 }, (_, i) => ({ fecha: `2026-09-${String(i + 1).padStart(2, '0')}`, kg: 75 }))
    const g = miniGraficaPeso(pesos, '2026-10-09', { n: 5, alto: 32 })!
    expect(g.d.split('L')).toHaveLength(5)
    expect(g.ultimo.y).toBe(16)
  })
})
