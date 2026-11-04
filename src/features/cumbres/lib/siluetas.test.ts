import { describe, expect, it } from 'vitest'
import { MONTANAS } from './montanas'
import { FORMA_GENERICA, puntoEnLadera, trazadoSilueta } from './perfil'
import { SILUETAS, formaDe } from './siluetas'

describe('siluetas de las montañas', () => {
  it('cada montaña tiene la suya y no sobra ninguna', () => {
    expect(Object.keys(SILUETAS).sort()).toEqual(MONTANAS.map((m) => m.id).sort())
  })

  it.each(Object.entries(SILUETAS))('%s: sube siempre hasta la cima y baja por debajo de ella hasta la base', (_, forma) => {
    const { subida, bajada } = forma
    expect(subida[0]).toEqual([0, 0])
    expect(subida[subida.length - 1][1]).toBe(1)
    for (let i = 1; i < subida.length; i++) {
      expect(subida[i][0]).toBeGreaterThan(subida[i - 1][0])
      expect(subida[i][1]).toBeGreaterThan(subida[i - 1][1])
    }
    expect(bajada[bajada.length - 1]).toEqual([1, 0])
    const cima = subida[subida.length - 1][0]
    for (let i = 0; i < bajada.length; i++) {
      expect(bajada[i][1]).toBeLessThanOrEqual(1)
      expect(bajada[i][0]).toBeGreaterThanOrEqual(i === 0 ? cima : bajada[i - 1][0])
    }
  })

  it('la marca va por su ladera y sin forma propia queda la genérica', () => {
    const l = { ancho: 100, alto: 100, margen: 0 }
    const cima = puntoEnLadera(l, 1, formaDe('cervino'))
    expect(cima.x).toBeCloseTo(58)
    expect(cima.y).toBeCloseTo(0)
    expect(trazadoSilueta(l, formaDe('fuji'))).not.toBe(trazadoSilueta(l))
    expect(formaDe('desconocida')).toBe(FORMA_GENERICA)
  })
})
