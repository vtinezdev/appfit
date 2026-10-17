import { describe, expect, it, vi } from 'vitest'
import { GuardadoLocal } from './guardadoLocal'

function diferida() { let resolver!: () => void; const promesa = new Promise<void>(r => { resolver = r }); return { promesa, resolver } }

describe('guardado local de una sesión', () => {
  it('conserva el orden de las escrituras de un registro y espera a todas', async () => {
    const g = new GuardadoLocal(), bloqueo = diferida(), valores: number[] = []
    const a = g.guardar('serie', async () => { await bloqueo.promesa; valores.push(1) })
    const b = g.guardar('serie', async () => { valores.push(2) })
    expect(g.estado()).toEqual({ pendientes: 2, errores: 0 })
    bloqueo.resolver(); await Promise.all([a, b]); await g.esperar()
    expect(valores).toEqual([1, 2]); expect(g.estado()).toEqual({ pendientes: 0, errores: 0 })
  })
  it('mantiene un fallo visible y permite reintentar sin repetir escrituras ya guardadas', async () => {
    const g = new GuardadoLocal(), escribir = vi.fn().mockRejectedValueOnce(new Error('cuota')).mockResolvedValue(undefined)
    const otra = vi.fn(async () => {})
    await expect(g.guardar('nota', escribir)).rejects.toThrow('cuota')
    await g.guardar('serie', otra)
    expect(g.estado().errores).toBe(1); await expect(g.esperar()).rejects.toThrow('sin guardar')
    await g.reintentar(); expect(escribir).toHaveBeenCalledTimes(2); expect(otra).toHaveBeenCalledTimes(1)
    expect(g.estado()).toEqual({ pendientes: 0, errores: 0 })
  })
  it('un fallo antiguo no resucita después de una edición más reciente', async () => {
    const g = new GuardadoLocal(), bloqueo = diferida()
    const vieja = g.guardar('peso', async () => { await bloqueo.promesa; throw new Error('antigua') })
    const rechazada = expect(vieja).rejects.toThrow('antigua')
    const nueva = vi.fn(async () => {})
    const reciente = g.guardar('peso', nueva)
    bloqueo.resolver(); await rechazada; await reciente; await g.reintentar()
    expect(nueva).toHaveBeenCalledTimes(1); expect(g.estado().errores).toBe(0)
  })
  it('olvida el reintento de una serie que la persona ha borrado', async () => {
    const g = new GuardadoLocal(), escribir = vi.fn().mockRejectedValue(new Error('fallo'))
    await expect(g.guardar('serie', escribir)).rejects.toThrow()
    g.olvidar('serie'); await g.reintentar(); expect(escribir).toHaveBeenCalledTimes(1)
  })
})
