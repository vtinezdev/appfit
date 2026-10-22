import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { leerDiaActual, observarDiaActual } from './diaActual'

let limpiar: (() => void)[] = []
beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('window', new EventTarget())
  vi.stubGlobal('document', new EventTarget())
  vi.setSystemTime(new Date(2026, 9, 21, 23, 59, 59))
})
afterEach(() => {
  limpiar.forEach(fn => fn()); limpiar = []
  vi.useRealTimers(); vi.unstubAllGlobals()
})

describe('día actual compartido', () => {
  it('cambia en medianoche local sin escrituras y comparte un solo temporizador', () => {
    const fechas: string[] = []
    limpiar.push(observarDiaActual(() => fechas.push(leerDiaActual())), observarDiaActual(() => {}))
    expect(vi.getTimerCount()).toBe(1)
    vi.advanceTimersByTime(1000)
    expect(fechas).toEqual(['2026-10-22'])
    expect(vi.getTimerCount()).toBe(1)
  })
  it.each(['focus', 'pageshow', 'visibilitychange'])('actualiza tras suspensión del reloj: %s', evento => {
    const cambio = vi.fn()
    limpiar.push(observarDiaActual(cambio))
    vi.setSystemTime(new Date(2026, 9, 23, 8))
    ;(evento === 'visibilitychange' ? document : window).dispatchEvent(new Event(evento))
    expect(cambio).toHaveBeenCalledOnce()
    expect(leerDiaActual()).toBe('2026-10-23')
    expect(vi.getTimerCount()).toBe(1)
  })
  it('deja de escuchar y retira el temporizador al desmontar el último consumidor', () => {
    const cambio = vi.fn(), parar = observarDiaActual(cambio)
    parar()
    window.dispatchEvent(new Event('focus'))
    expect(cambio).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })
})
