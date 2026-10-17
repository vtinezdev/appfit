import { describe, expect, it } from 'vitest'
import { diasTendencia, puntosTendencia } from './tendencias'
describe('tendencias de registros', () => {
  it('filtra el periodo inclusivo, ordena y excluye futuros sin mutar los registros', () => {
    const puntos = [{ fecha: '2026-10-17', valor: 80 }, { fecha: '2026-10-10', valor: 85 }, { fecha: '2026-10-11', valor: 84 }, { fecha: '2026-10-18', valor: 90 }, { fecha: '2026-10-16', valor: NaN }]
    expect(puntosTendencia(puntos, '7', '2026-10-17')).toEqual([puntos[2], puntos[0]])
    expect(puntos).toHaveLength(5)
  })
  it('conserva un cero registrado y distingue un día sin registro', () => {
    const puntos = [{ fecha: '2026-10-15', valor: 0 }, { fecha: '2026-10-17', valor: 500 }]
    expect(diasTendencia(puntos)).toEqual([puntos[0], { fecha: '2026-10-16', valor: null }, puntos[1]])
    expect(diasTendencia([])).toEqual([])
  })
  it('todo incluye el historial antiguo y una fecha repetida conserva el último valor', () => {
    expect(puntosTendencia([{ fecha: '2000-01-01', valor: 50 }, { fecha: '2000-01-01', valor: 51 }], 'todo', '2026-10-17')).toEqual([{ fecha: '2000-01-01', valor: 51 }])
  })
})
