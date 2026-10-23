import { describe, expect, it, vi, afterEach } from 'vitest'
import { ajustarDescanso, clearSession, clockText, descansoParaEjercicio, emptySession, readSession, remainingSeconds, seriesMarcadas, siguienteEjercicioPendiente, writeSession } from './session'
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
  it('el descanso por ejercicio manda sobre el global', () => {
    expect(descansoParaEjercicio(150, 90)).toBe(150)
    expect(descansoParaEjercicio(undefined, 90)).toBe(90)
    expect(descansoParaEjercicio(0, 0)).toBe(0)
  })
  it('−15/+15 mueven el deadline y la barra; sin tiempo restante el descanso termina', () => {
    const s = { completed: [], restSeconds: 90, restEndsAt: 90000, restTotal: 90 }
    expect(ajustarDescanso(s, 15, 0)).toEqual({ ...s, restEndsAt: 105000, restTotal: 105 })
    expect(ajustarDescanso(s, -15, 30000)).toEqual({ ...s, restEndsAt: 75000, restTotal: 75 })
    // Quedan 10 s y se restan 15: termina.
    expect(ajustarDescanso(s, -15, 80000).restEndsAt).toBeNull()
    // Sin descanso en curso no cambia nada.
    const quieto = { ...s, restEndsAt: null }
    expect(ajustarDescanso(quieto, 15, 0)).toBe(quieto)
    // Sin duración guardada usa la global; la barra nunca queda por debajo de lo que falta.
    expect(ajustarDescanso({ completed: [], restSeconds: 60, restEndsAt: 50000 }, 15, 0)).toEqual({ completed: [], restSeconds: 60, restEndsAt: 65000, restTotal: 75 })
    expect(ajustarDescanso({ ...s, restTotal: 20 }, 15, 0).restTotal).toBe(105)
  })
})

describe('seriesMarcadas', () => {
  it('la confirmación persistida manda sobre la marca de la sesión', () => {
    const sets = [{ id: 1, realizada: true }, { id: 2, realizada: false }, { id: 3 }, { id: 4 }]
    expect(seriesMarcadas(sets, [2, 3])).toEqual([1, 3])
    expect(seriesMarcadas([], [1])).toEqual([])
  })
})

describe('siguiente ejercicio pendiente al completar uno', () => {
  // Ejercicios 10, 20, 30 y 40 con dos series cada uno (ids 101, 102, 201…); el 30 incluye un calentamiento (300).
  const sets = [10, 20, 30, 40].flatMap(e => [{ id: e * 10 + 1, exerciseId: e }, { id: e * 10 + 2, exerciseId: e }]).concat({ id: 300, exerciseId: 30 })
  const orden = [10, 20, 30, 40]

  it('el siguiente en el orden de la sesión con alguna serie sin marcar', () => {
    expect(siguienteEjercicioPendiente(orden, sets, [101, 102], 10)).toBe(20)
    expect(siguienteEjercicioPendiente(orden, sets, [101, 102, 201, 202], 10)).toBe(30)
    // El calentamiento también cuenta: con solo las efectivas hechas, el 30 sigue pendiente.
    expect(siguienteEjercicioPendiente(orden, sets, [201, 202, 301, 302], 20)).toBe(30)
  })

  it('desde el último vuelve a los anteriores; con todo hecho, ninguno', () => {
    expect(siguienteEjercicioPendiente(orden, sets, [401, 402, 101, 102], 40)).toBe(20)
    const todas = sets.map(s => s.id)
    expect(siguienteEjercicioPendiente(orden, sets, todas, 40)).toBeNull()
    expect(siguienteEjercicioPendiente([10], sets, [101, 102], 10)).toBeNull()
  })

  it('un ejercicio sin series todavía cuenta como pendiente', () => {
    expect(siguienteEjercicioPendiente([10, 50, 20], sets, [101, 102], 10)).toBe(50)
  })

  it('sigue el orden manual de la sesión, no el de creación', () => {
    expect(siguienteEjercicioPendiente([30, 10, 40, 20], sets, [101, 102, 401, 402], 10)).toBe(20)
    // Un ejercicio que ya no está en la sesión: se busca desde el principio.
    expect(siguienteEjercicioPendiente(orden, sets, [101, 102], 99)).toBe(20)
  })
})
