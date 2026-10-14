import { describe, expect, it } from 'vitest'
import { marcarPistaVista, pistaPendiente } from './pistas'

describe('pistas de primera vez', () => {
  it('sin registro, todas están pendientes', () => {
    expect(pistaPendiente(undefined, 'entreno-series')).toBe(true)
    expect(pistaPendiente([], 'entreno-series')).toBe(true)
  })

  it('una pista cerrada deja de estar pendiente y no afecta a las demás', () => {
    const vistas = marcarPistaVista(undefined, 'entreno-series')
    expect(pistaPendiente(vistas, 'entreno-series')).toBe(false)
    expect(pistaPendiente(vistas, 'detalle-confirmar')).toBe(true)
  })

  it('marcar no repite y conserva ids desconocidos', () => {
    expect(marcarPistaVista(['otra', 'entreno-series'], 'entreno-series')).toEqual(['entreno-series', 'otra'])
  })
})
