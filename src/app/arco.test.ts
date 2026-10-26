import { describe, expect, it } from 'vitest'
import { ARCO, posicionesArco } from './arco'

/** Caja de cada sección en px a 320 px de ancho, con y hacia abajo. */
function cajas(cantidad: number) {
  return posicionesArco(cantidad).map(({ x, y }) => {
    const cx = x * ARCO.rxMinimo, cy = y * ARCO.ry
    return { izq: cx - ARCO.ancho / 2, der: cx + ARCO.ancho / 2, sup: cy - ARCO.arriba, inf: cy + ARCO.abajo }
  })
}

describe('posicionesArco', () => {
  it('fuera de rango no devuelve puntos', () => {
    expect(posicionesArco(0)).toEqual([])
    expect(posicionesArco(2.5)).toEqual([])
  })

  it('va de izquierda a derecha por encima del botón, simétrica', () => {
    for (const n of [2, 5, 6]) {
      const puntos = posicionesArco(n)
      expect(puntos).toHaveLength(n)
      puntos.forEach((p, i) => {
        expect(p.y).toBeLessThan(0)
        if (i > 0) expect(p.x).toBeGreaterThan(puntos[i - 1].x)
        expect(p.x).toBeCloseTo(-puntos[n - 1 - i].x, 3)
        expect(p.y).toBeCloseTo(puntos[n - 1 - i].y, 3)
      })
    }
  })

  it.each([5, 6, 7])('con %i secciones, a la órbita habitual quedan a la misma distancia unas de otras', (n) => {
    const puntos = posicionesArco(n).map(({ x, y }) => ({ x: x * ARCO.rxHabitual, y: y * ARCO.ry }))
    const huecos = puntos.slice(1).map((p, i) => Math.hypot(p.x - puntos[i].x, p.y - puntos[i].y))
    // La cuerda entre vecinas apenas cambia: sin la diferencia de más de 40 px que dejaban los ángulos iguales.
    expect(Math.max(...huecos) - Math.min(...huecos)).toBeLessThan(6)
  })

  it.each([5, 6, 7])('con %i secciones, a 320 px ninguna pisa a otra ni al botón ni sale de la pantalla', (n) => {
    const todas = cajas(n)
    const boton = 30 // radio del botón central (60 px)
    for (const [i, a] of todas.entries()) {
      expect(a.izq).toBeGreaterThanOrEqual(-160 + 8)
      expect(a.der).toBeLessThanOrEqual(160 - 8)
      // El nombre de los extremos baja como mucho 30 px del centro del botón, que está a 38 px del borde inferior.
      expect(a.inf).toBeLessThanOrEqual(30)
      expect(a.der <= -boton || a.izq >= boton || a.inf <= -boton).toBe(true)
      for (const b of todas.slice(i + 1)) {
        const separadas = a.der <= b.izq || b.der <= a.izq || a.inf <= b.sup || b.inf <= a.sup
        expect(separadas).toBe(true)
      }
    }
  })
})
