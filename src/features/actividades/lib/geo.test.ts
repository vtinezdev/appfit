import { describe, expect, it } from 'vitest'
import type { PuntoRecorrido } from '../../../shared/db/types'
import { desnivelPositivo, distanciaM, distanciaRecorrido, perfilAltitud, proyectarRecorrido, redondearPunto, simplificarRecorrido } from './geo'

// Un grado de latitud son unos 111,2 km; 0,001° ≈ 111 m.
const norte = (i: number, ele?: number): PuntoRecorrido => (ele === undefined ? [42.88 + i * 0.001, -8.54] : [42.88 + i * 0.001, -8.54, ele])

describe('distancias', () => {
  it('un grado de latitud mide unos 111,2 km', () => {
    expect(distanciaM([0, 0], [1, 0])).toBeCloseTo(111_195, -1)
  })

  it('suma dentro de cada tramo y no entre tramos', () => {
    const tramo = [norte(0), norte(1), norte(2)]
    const uno = distanciaRecorrido([tramo])
    expect(uno).toBeCloseTo(222.4, 0)
    expect(distanciaRecorrido([tramo, [norte(50), norte(51)]])).toBeCloseTo(uno + 111.2, 0)
  })
})

describe('desnivel positivo', () => {
  it('suma las subidas reales y no el ruido por debajo del umbral', () => {
    const ruido = [100, 102, 99, 101, 100, 103, 100].map((e, i) => norte(i, e))
    expect(desnivelPositivo([ruido])).toBe(0)
    const sube = [100, 110, 120, 115, 140].map((e, i) => norte(i, e))
    expect(desnivelPositivo([sube])).toBe(45) // 100→110→120, baja a 115 y sube a 140
  })

  it('sin altitudes es undefined', () => {
    expect(desnivelPositivo([[norte(0), norte(1)]])).toBeUndefined()
  })
})

describe('simplificar', () => {
  it('quita los puntos alineados y conserva los extremos', () => {
    const recta = Array.from({ length: 50 }, (_, i) => norte(i))
    const r = simplificarRecorrido([recta])
    expect(r).toHaveLength(1)
    expect(r[0]).toHaveLength(2)
    expect(r[0][0]).toEqual(redondearPunto(recta[0]))
    expect(r[0][1]).toEqual(redondearPunto(recta[49]))
  })

  it('conserva las esquinas', () => {
    const ele: PuntoRecorrido[] = [[42.88, -8.54], [42.885, -8.54], [42.89, -8.54], [42.89, -8.535], [42.89, -8.53]]
    expect(simplificarRecorrido([ele])[0]).toEqual([[42.88, -8.54], [42.89, -8.54], [42.89, -8.53]])
  })

  it('no pasa del máximo de puntos', () => {
    const zigzag = Array.from({ length: 5000 }, (_, i): PuntoRecorrido => [42.88 + i * 0.0001, -8.54 + (i % 2) * 0.001])
    const r = simplificarRecorrido([zigzag], 300)
    expect(r.flat().length).toBeLessThanOrEqual(300)
  })

  it('descarta tramos de un solo punto y redondea a 5 decimales y la altitud a metros', () => {
    expect(simplificarRecorrido([[norte(0)], [[42.123456789, -8.987654321, 100.6], [42.2, -8.9]]])).toEqual([[[42.12346, -8.98765, 101], [42.2, -8.9]]])
  })
})

describe('proyección', () => {
  it('cabe en la caja con el norte arriba y respeta la proporción', () => {
    const t = proyectarRecorrido([[norte(0), norte(10)]], 100, 50, 5)!
    expect(t.inicio![1]).toBeGreaterThan(t.fin![1]) // el norte (fin) queda más arriba
    expect(t.inicio![0]).toBe(50) // una línea norte-sur queda centrada
    expect(t.inicio![1]).toBe(45)
    expect(t.fin![1]).toBe(5)
    expect(t.tramos[0]).toBe('M50 45 L50 5')
    expect(proyectarRecorrido([[norte(0), norte(10)]], 100, 50, 5, [norte(5)])!.extras).toEqual([[50, 25]])
  })

  it('sin dos puntos no hay trazado', () => {
    expect(proyectarRecorrido([[norte(0)]], 100, 100)).toBeNull()
  })
})

describe('perfil de altitud', () => {
  it('acumula la distancia también a través de puntos sin altitud', () => {
    const p = perfilAltitud([[norte(0, 100), norte(1), norte(2, 120)]])
    expect(p).toHaveLength(2)
    expect(p[0]).toEqual({ distanciaM: 0, ele: 100 })
    expect(p[1].distanciaM).toBeCloseTo(222.4, 0)
  })
})
