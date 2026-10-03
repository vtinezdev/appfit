import { describe, expect, it, vi, afterEach } from 'vitest'
import { clearSession, clockText, emptySession, readSession, remainingSeconds, writeSession } from './session'
afterEach(() => vi.unstubAllGlobals())
describe('estado de interacción del entreno, independiente de los datos', () => {
  it('sin storage o con JSON inválido funciona en memoria', () => {
    expect(readSession(1)).toEqual(emptySession())
    vi.stubGlobal('sessionStorage', { getItem: () => '{' })
    expect(readSession(1)).toEqual(emptySession())
    expect(() => writeSession(1, emptySession())).not.toThrow()
    expect(() => clearSession(1)).not.toThrow()
  })
  it('valida ids, duración y deadline al recuperar la sesión', () => {
    vi.stubGlobal('sessionStorage', { getItem: () => JSON.stringify({ completed: [1, -2, '3', 4.5], restSeconds: 19, restEndsAt: 'ayer' }) })
    expect(readSession(2)).toEqual({ completed: [1], restSeconds: 0, restEndsAt: null })
  })
  it('aísla los entrenos y conserva el descanso al volver', () => {
    const storage = new Map<string, string>()
    vi.stubGlobal('sessionStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) })
    const state = { completed: [5, 6], restSeconds: 90, restEndsAt: 123000 }
    writeSession(1, state)
    expect(readSession(1)).toEqual(state)
    expect(readSession(2)).toEqual(emptySession())
    clearSession(1)
    expect(readSession(1)).toEqual(emptySession())
  })
  it('el descanso usa tiempo real, no ticks acumulados', () => {
    expect(remainingSeconds(90000, 0)).toBe(90)
    expect(remainingSeconds(90000, 30500)).toBe(60)
    expect(remainingSeconds(90000, 100000)).toBe(0)
  })
  it.each([[0, '00:00'], [9, '00:09'], [90, '01:30'], [3661, '61:01'], [-1, '00:00']])('formatea %s como %s sin contar desde cero', (seconds, value) => {
    expect(clockText(seconds as number)).toBe(value)
  })
})
