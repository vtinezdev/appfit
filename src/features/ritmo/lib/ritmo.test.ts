import { describe, expect, it } from 'vitest'
import type { Pausa } from '../../../shared/db/types'
import { addDays } from '../../../shared/lib/dates'
import { calcularRitmo, estadoDeSemana, type DatosRitmo } from './ritmo'

/** Lunes de la semana `n` a partir del 7 de septiembre de 2026. */
const lunes = (n: number) => addDays('2026-09-07', 7 * n)
const plan = { entrenos: 3, diasRegistro: 5 }

/** Días de la semana `n`: entrenos el lunes, miércoles y viernes; registro desde el lunes. */
function semana(n: number, { entrenos = 3, registro = 5 } = {}) {
  return {
    entrenos: [0, 2, 4].slice(0, entrenos).map((d) => addDays(lunes(n), d)),
    registro: [0, 1, 2, 3, 4, 5, 6].slice(0, registro).map((d) => addDays(lunes(n), d)),
  }
}
const vacia = () => ({ entrenos: [] as string[], registro: [] as string[] })

function datos(semanas: ReturnType<typeof semana>[], extra: Partial<DatosRitmo> = {}): DatosRitmo {
  return {
    hoy: addDays(lunes(semanas.length), 2), // miércoles de la semana siguiente a la última
    diasEntreno: new Set(semanas.flatMap((s) => s.entrenos)),
    diasRegistro: new Set(semanas.flatMap((s) => s.registro)),
    ...extra,
  }
}

describe('estadoDeSemana', () => {
  const base = { plan, cumplida: false, cumplidaEl: null }
  it('cumplida, parcial, presente o vacía', () => {
    expect(estadoDeSemana({ ...base, entrenos: 3, diasRegistrados: 5, cumplida: true, cumplidaEl: 'x' }, null)).toBe('cumplida')
    expect(estadoDeSemana({ ...base, entrenos: 3, diasRegistrados: 2 }, null)).toBe('parcial')
    expect(estadoDeSemana({ ...base, entrenos: 0, diasRegistrados: 5 }, null)).toBe('parcial')
    expect(estadoDeSemana({ ...base, entrenos: 1, diasRegistrados: 0 }, null)).toBe('presente')
    expect(estadoDeSemana({ ...base, entrenos: 0, diasRegistrados: 3 }, null)).toBe('presente')
    expect(estadoDeSemana({ ...base, entrenos: 0, diasRegistrados: 2 }, null)).toBe('vacia')
  })

  it('sin nutrición no hay parcial; en pausa de entreno solo cuenta el registro', () => {
    expect(estadoDeSemana({ ...base, entrenos: 2, diasRegistrados: null }, null)).toBe('presente')
    const pausa: Pausa = { id: 'p', desde: '2026-01-01', tipo: 'entreno', motivo: 'lesion' }
    expect(estadoDeSemana({ ...base, entrenos: 2, diasRegistrados: 1 }, pausa)).toBe('vacia')
  })
})

describe('calcularRitmo', () => {
  it('el hilo suma semanas con presencia; una vacía sin comodín lo rompe; el mejor se conserva', () => {
    const r = calcularRitmo(datos([semana(0), semana(1, { entrenos: 1, registro: 0 }), vacia(), semana(3)]))
    expect(r.semanas.map((s) => s.estado)).toEqual(['cumplida', 'presente', 'vacia', 'cumplida', 'vacia'])
    expect(r.semanas.map((s) => s.hilo)).toEqual([1, 2, 0, 1, 1])
    expect(r.mejorHilo).toBe(2)
    expect(r.hiloActual).toBe(1) // la semana en curso, vacía, aún no rompe
    expect(r.semanas[3].vuelta).toBe(true)
    expect(r.vueltas).toBe(1)
  })

  it('un comodín por cada 4 cumplidas (máximo 2) salva una semana vacía', () => {
    const r = calcularRitmo(datos([semana(0), semana(1), semana(2), semana(3), vacia(), semana(5)]))
    expect(r.semanas[4]).toMatchObject({ estado: 'vacia', comodin: true, hilo: 4 })
    expect(r.semanas[5].hilo).toBe(5)
    expect(r.comodines).toBe(0)
    const muchas = calcularRitmo(datos(Array.from({ length: 13 }, (_, i) => semana(i))))
    expect(muchas.comodines).toBe(2)
    expect(muchas.progresoComodin).toBe(1)
  })

  it('una pausa congela el hilo: ni lo rompe ni gasta comodín', () => {
    const pausas: Pausa[] = [{ id: 'p', desde: lunes(1), hasta: addDays(lunes(1), 6), tipo: 'total', motivo: 'vacaciones' }]
    const r = calcularRitmo(datos([semana(0), vacia(), semana(2)], { pausas }))
    expect(r.semanas[1]).toMatchObject({ congelada: true, hilo: 1 })
    expect(r.semanas[2].hilo).toBe(2)
  })

  it('en pausa de entreno, la semana se cumple con el registro', () => {
    const pausas: Pausa[] = [{ id: 'p', desde: lunes(0), tipo: 'entreno', motivo: 'lesion' }]
    const r = calcularRitmo(datos([semana(0, { entrenos: 0 })], { pausas, planes: [{ desde: lunes(0), ...plan }] }))
    expect(r.semanas[0]).toMatchObject({ estado: 'cumplida', cumplidaEl: addDays(lunes(0), 4) })
  })

  it('hitos con la fecha en que se cumplió la semana que los alcanza', () => {
    const r = calcularRitmo(datos(Array.from({ length: 5 }, (_, i) => semana(i))))
    expect(r.hitos[0]).toEqual({ semanas: 4, fecha: addDays(lunes(3), 4) })
    expect(r.hitos[1].fecha).toBeNull()
    expect(r.cumplidas).toBe(5)
  })

  it('sin registros solo está la semana actual, vacía', () => {
    const r = calcularRitmo({ hoy: '2026-10-10', diasEntreno: new Set(), diasRegistro: new Set() })
    expect(r.semanas).toHaveLength(1)
    expect(r.actual).toMatchObject({ lunes: '2026-10-05', estado: 'vacia', cerrada: false, hilo: 0 })
  })
})
