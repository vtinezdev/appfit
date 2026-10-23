import { describe, expect, it } from 'vitest'
import type { PuntoRecorrido } from '../../../shared/db/types'
import { distanciaRecorrido } from './geo'
import { kmMasRapido, parcialesPorKm, simplificarConTiempos, tiemposDesde, tiemposValidos } from './parciales'

/** Línea recta hacia el norte, un punto cada ~111 m, con `ritmo(m)` segundos por km en cada metro recorrido. */
function recta(puntos: number, ritmo: (metros: number) => number, lat0 = 40, t0 = 0): { tramo: PuntoRecorrido[]; tiempos: number[] } {
  const tramo: PuntoRecorrido[] = []
  const tiempos: number[] = []
  let t = t0
  for (let i = 0; i < puntos; i++) {
    const p: PuntoRecorrido = [lat0 + i * 0.001, -3.7]
    if (i > 0) {
      const d = distanciaRecorrido([[tramo[i - 1], p]])
      t += ritmo(distanciaRecorrido([[...tramo, p]])) * d / 1000
    }
    tramo.push(p)
    tiempos.push(Math.round(t * 10) / 10)
  }
  return { tramo, tiempos }
}

describe('parciales por km', () => {
  it('a ritmo constante, cada km igual y el resto con su ritmo', () => {
    const { tramo, tiempos } = recta(30, () => 300) // ~3,2 km
    const distanciaM = Math.round(distanciaRecorrido([tramo]))
    const p = parcialesPorKm({ recorrido: [tramo], tiempos: [tiempos], distanciaM })
    expect(p.map((x) => x.km)).toEqual([1, 2, 3, 4])
    expect(p.slice(0, 3).map((x) => x.metros)).toEqual([1000, 1000, 1000])
    for (const x of p) expect(x.ritmo).toBeCloseTo(300, 0)
    expect(p[3].metros).toBe(distanciaM - 3000)
    expect(p.reduce((s, x) => s + x.segundos, 0)).toBeCloseTo(tiempos.at(-1)!, 0)
  })

  it('cada km con su ritmo y el más rápido', () => {
    const { tramo, tiempos } = recta(28, (m) => (m <= 1000 ? 330 : m <= 2000 ? 290 : 310))
    const p = parcialesPorKm({ recorrido: [tramo], tiempos: [tiempos], distanciaM: Math.round(distanciaRecorrido([tramo])) })
    expect(p[0].ritmo).toBeCloseTo(330, -1)
    expect(p[1].ritmo).toBeCloseTo(290, -1)
    expect(kmMasRapido(p)).toBe(2)
  })

  it('una pausa entre tramos no cuenta', () => {
    const a = recta(10, () => 300)
    const b = recta(12, () => 300, 40.02, a.tiempos.at(-1)! + 600)
    const distanciaM = Math.round(distanciaRecorrido([a.tramo, b.tramo]))
    const p = parcialesPorKm({ recorrido: [a.tramo, b.tramo], tiempos: [a.tiempos, b.tiempos], distanciaM })
    expect(p[0].ritmo).toBeCloseTo(300, 0)
    expect(p[1].ritmo).toBeCloseTo(300, 0)
  })

  it('reparte la distancia guardada en proporción a la del recorrido', () => {
    const { tramo, tiempos } = recta(30, () => 300)
    const real = distanciaRecorrido([tramo])
    const p = parcialesPorKm({ recorrido: [tramo], tiempos: [tiempos], distanciaM: Math.round(real * 1.1) })
    // Mismo tiempo para un 10 % más de distancia: cada km, un 10 % más rápido.
    expect(p[0].ritmo).toBeCloseTo(300 / 1.1, 0)
  })

  it('sin tiempos, si no encajan o con menos de un km, no hay parciales', () => {
    const { tramo, tiempos } = recta(30, () => 300)
    const distanciaM = Math.round(distanciaRecorrido([tramo]))
    expect(parcialesPorKm({ recorrido: [tramo], distanciaM })).toEqual([])
    expect(parcialesPorKm({ recorrido: [tramo], tiempos: [tiempos.slice(1)], distanciaM })).toEqual([])
    const corto = recta(8, () => 300)
    expect(parcialesPorKm({ recorrido: [corto.tramo], tiempos: [corto.tiempos], distanciaM: 800 })).toEqual([])
    expect(tiemposValidos([tramo], [tiempos])).toBe(true)
    expect(tiemposValidos([tramo], [[...tiempos.slice(1), Number.NaN]])).toBe(false)
  })

  it('un resto de menos de 100 m no se enseña; un solo km entero no tiene «más rápido»', () => {
    const { tramo, tiempos } = recta(11, () => 300) // ~1.112 m
    const p = parcialesPorKm({ recorrido: [tramo], tiempos: [tiempos], distanciaM: 1050 })
    expect(p.map((x) => x.metros)).toEqual([1000])
    expect(kmMasRapido(p)).toBeNull()
  })
})

describe('tiempos para guardar', () => {
  it('segundos desde el origen con un decimal; sin hora en algún punto, ninguno', () => {
    expect(tiemposDesde([[1000, 2500, 4049], [9000]], 1000)).toEqual([[0, 1.5, 3], [8]])
    expect(tiemposDesde([[1000, undefined]], 1000)).toBeUndefined()
    expect(tiemposDesde([], 0)).toBeUndefined()
  })

  it('al simplificar, se queda con la hora de los mismos puntos', () => {
    const { tramo, tiempos } = recta(30, () => 300)
    const r = simplificarConTiempos([tramo, [tramo[0]]], [tiempos, [0]])
    // Línea recta: quedan el primero y el último; el tramo de un punto se descarta.
    expect(r.recorrido).toHaveLength(1)
    expect(r.recorrido[0]).toHaveLength(2)
    expect(r.tiempos).toEqual([[tiempos[0], tiempos.at(-1)]])
    expect(simplificarConTiempos([tramo], undefined).tiempos).toBeUndefined()
  })

  it('en una recta con cambios de ritmo conserva esos puntos y los parciales sobreviven a la simplificación', () => {
    const { tramo, tiempos } = recta(40, (m) => (m <= 1000 ? 360 : m <= 2000 ? 270 : 330))
    const distanciaM = Math.round(distanciaRecorrido([tramo]))
    const antes = parcialesPorKm({ recorrido: [tramo], tiempos: [tiempos], distanciaM })
    const r = simplificarConTiempos([tramo], [tiempos])
    expect(r.recorrido[0].length).toBeGreaterThan(2)
    const despues = parcialesPorKm({ recorrido: r.recorrido, tiempos: r.tiempos, distanciaM })
    despues.forEach((p, i) => expect(Math.abs(p.ritmo - antes[i].ritmo)).toBeLessThan(5))
    expect(kmMasRapido(despues)).toBe(2)
  })

  it('sin un km claramente más rápido, no se señala ninguno', () => {
    const { tramo, tiempos } = recta(30, () => 300)
    expect(kmMasRapido(parcialesPorKm({ recorrido: [tramo], tiempos: [tiempos], distanciaM: Math.round(distanciaRecorrido([tramo])) }))).toBeNull()
  })
})
