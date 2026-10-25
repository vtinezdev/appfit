import { describe, expect, it } from 'vitest'
import type { SemanaRitmo } from './ritmo'
import { cifrasSemana, faltaParaCumplir, textoEstado, textoHilo } from './textos'

const semana = (s: Partial<SemanaRitmo> = {}): SemanaRitmo => ({
  lunes: '2026-10-05', plan: { entrenos: 3, diasRegistro: 5 }, entrenos: 2, diasRegistrados: 4, cumplida: false, cumplidaEl: null,
  estado: 'parcial', pausa: null, cerrada: false, comodin: false, congelada: false, vuelta: false, hilo: 3, presenteEl: '2026-10-05', ...s,
})

describe('textos de Ritmo', () => {
  it('cifras, hilo y lo que falta', () => {
    expect(cifrasSemana(semana())).toBe('2 de 3 entrenos · 4 de 5 días registrados')
    expect(cifrasSemana(semana({ diasRegistrados: null }))).toBe('2 de 3 entrenos')
    expect([0, 1, 6].map(textoHilo)).toEqual(['Sin hilo todavía', 'Hilo de 1 semana', 'Hilo de 6 semanas'])
    expect(faltaParaCumplir(semana())).toBe('Para cumplirla: 1 entreno y 1 día registrado más')
    expect(faltaParaCumplir(semana({ cumplida: true }))).toBeNull()
    expect(faltaParaCumplir(semana({ pausa: { id: 'p', desde: '2026-10-01', tipo: 'entreno', motivo: 'lesion' } }))).toBe('Para cumplirla: 1 día registrado más')
  })

  it('estado en una frase', () => {
    expect(textoEstado(semana({ cerrada: true, estado: 'cumplida', vuelta: true }))).toBe('Cumplida · vuelta')
    expect(textoEstado(semana({ cerrada: true, estado: 'vacia', comodin: true }))).toBe('Vacía, salvada con un comodín')
    expect(textoEstado(semana({ estado: 'vacia' }))).toBe('En curso')
  })
})
