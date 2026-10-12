import { describe, expect, it } from 'vitest'
import { desplazamientoFila, finDeslizar } from './deslizar'

describe('finDeslizar', () => {
  it('poco recorrido vuelve; media acción abre; más del 60 % de la fila borra', () => {
    expect(finDeslizar(-20, 340, 88)).toBe('cerrar')
    expect(finDeslizar(-50, 340, 88)).toBe('abrir')
    expect(finDeslizar(-210, 340, 88)).toBe('borrar')
  })
  it('hacia la derecha nunca abre ni borra', () => expect(finDeslizar(120, 340, 88)).toBe('cerrar'))
})

describe('desplazamientoFila', () => {
  it('solo a la izquierda, con resistencia pasado el botón y sin salirse de la fila', () => {
    expect(desplazamientoFila(30, 340, 88)).toBe(0)
    expect(desplazamientoFila(-60, 340, 88)).toBe(-60)
    expect(desplazamientoFila(-188, 340, 88)).toBeCloseTo(-173)
    expect(desplazamientoFila(-900, 340, 88)).toBe(-340)
  })
})
