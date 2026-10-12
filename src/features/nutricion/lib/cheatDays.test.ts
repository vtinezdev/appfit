import { describe, expect, it } from 'vitest'
import { calcularRachas } from './adherencia'
import { avisoAlMarcar, cheatDaysDeSemana, cheatDaysEnPeriodo, fechasDeRacha, notaCheatDays } from './cheatDays'

// 2026-10-12 es lunes; 2026-10-18, domingo.
describe('cheat days', () => {
  it('cuenta solo los de la semana (lunes a domingo) de la fecha', () => {
    expect(cheatDaysDeSemana('2026-10-14', [])).toBe(0)
    expect(cheatDaysDeSemana('2026-10-14', ['2026-10-12', '2026-10-18', '2026-10-11', '2026-10-19'])).toBe(2)
  })
  it('avisa al marcar el 2.º de la misma semana (y los siguientes), sin contar otras semanas', () => {
    expect(avisoAlMarcar('2026-10-17', [])).toBe('Día marcado como cheat day')
    expect(avisoAlMarcar('2026-10-17', ['2026-10-11'])).toBe('Día marcado como cheat day')
    expect(avisoAlMarcar('2026-10-17', ['2026-10-13'])).toBe('Es tu 2.º cheat day esta semana')
    expect(avisoAlMarcar('2026-10-17', ['2026-10-13', '2026-10-15'])).toBe('Es tu 3.º cheat day esta semana')
    // Volver a marcar el mismo día no suma.
    expect(avisoAlMarcar('2026-10-17', ['2026-10-17'])).toBe('Día marcado como cheat day')
  })
  it('cuenta los del periodo hasta hoy y redacta la nota', () => {
    const fechas = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15']
    expect(cheatDaysEnPeriodo(fechas, '2026-10-14', new Set(['2026-10-12', '2026-10-15', '2026-10-01']))).toBe(1)
    expect(notaCheatDays(0)).toBeNull()
    expect(notaCheatDays(1)).toBe('1 cheat day fuera de la media')
    expect(notaCheatDays(2)).toBe('2 cheat days fuera de la media')
  })
  it('un cheat day vacío no rompe la racha', () => {
    const conRegistro = ['2026-10-12', '2026-10-14']
    expect(calcularRachas(conRegistro, '2026-10-14').actual).toBe(1)
    expect(calcularRachas(fechasDeRacha(conRegistro, ['2026-10-13']), '2026-10-14')).toEqual({ actual: 3, mejor: 3 })
  })
})
