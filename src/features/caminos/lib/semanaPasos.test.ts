import { describe, expect, it } from 'vitest'
import { ERROR_PASOS } from './pasos'
import { borradorInicial, conDia, conTotal, diasDeSemana, ERROR_TOTAL, ERROR_VACIA, leerSemana, mensajeSemana, pasosDeSemana, repartirPasos, sustituye, ultimaSemana } from './semanaPasos'

const LUNES = '2026-10-19'
const SEMANA = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25']

describe('semana de pasos', () => {
  it('los días de la semana sin los futuros', () => {
    expect(diasDeSemana(LUNES, '2026-10-26')).toEqual(SEMANA)
    expect(diasDeSemana('2026-10-26', '2026-10-28')).toEqual(['2026-10-26', '2026-10-27', '2026-10-28'])
    expect(ultimaSemana('2026-10-25')).toBe(LUNES)
  })

  it('reparte a partes iguales y el resto va a los primeros días', () => {
    expect(repartirPasos(70_000, 7)).toEqual(Array(7).fill(10_000))
    expect(repartirPasos(10, 7)).toEqual([2, 2, 2, 1, 1, 1, 1])
    expect(repartirPasos(10, 7).reduce((a, b) => a + b)).toBe(10)
    expect(repartirPasos(5, 0)).toEqual([])
  })

  it('el borrador parte de lo apuntado y su suma', () => {
    const apuntados = new Map([['2026-10-20', 8000], ['2026-10-25', 4000], ['2026-10-18', 9999]])
    expect(borradorInicial(SEMANA, apuntados)).toEqual({ total: '12000', dias: { ...Object.fromEntries(SEMANA.map((f) => [f, ''])), '2026-10-20': '8000', '2026-10-25': '4000' } })
    expect(borradorInicial(SEMANA, new Map()).total).toBe('')
  })

  it('el total se reparte; un día cambiado deja el total en la suma', () => {
    const b = conTotal(borradorInicial(SEMANA, new Map()), SEMANA, '63.000')
    expect(Object.values(b.dias)).toEqual(Array(7).fill('9000'))
    const c = conDia(b, SEMANA, '2026-10-24', '15000')
    expect(c.total).toBe('69000')
    expect(c.dias['2026-10-19']).toBe('9000')
    expect(conTotal(c, SEMANA, '').dias['2026-10-24']).toBe('')
    // Mientras se escribe algo que no se entiende, los días no se tocan.
    expect(conTotal(c, SEMANA, '69.0').dias).toEqual(c.dias)
    expect(conTotal(c, SEMANA, '800000').dias).toEqual(c.dias)
  })

  it('al leer: días vacíos sin pasos, errores por día y un total que no cuadra', () => {
    const b = conTotal(borradorInicial(SEMANA, new Map()), SEMANA, '21000')
    const leido = leerSemana(SEMANA, conDia(b, SEMANA, '2026-10-25', ''))
    expect(leido).toEqual({ dias: SEMANA.map((fecha) => ({ fecha, pasos: fecha === '2026-10-25' ? null : 3000 })) })
    expect(leerSemana(SEMANA, conDia(b, SEMANA, '2026-10-21', '200000'))).toEqual({ error: ERROR_PASOS, fecha: '2026-10-21' })
    expect(leerSemana(SEMANA, { ...b, total: '800000' })).toEqual({ error: ERROR_TOTAL(7) })
    expect(leerSemana(SEMANA, conTotal(b, SEMANA, ''))).toEqual({ error: ERROR_VACIA })
  })

  it('sustituye si cambia un día apuntado; la suma de la semana hasta un día', () => {
    const apuntados = new Map([['2026-10-20', 8000], ['2026-10-26', 5000]])
    expect(sustituye([{ fecha: '2026-10-20', pasos: 8000 }, { fecha: '2026-10-21', pasos: 1 }], apuntados)).toBe(false)
    expect(sustituye([{ fecha: '2026-10-20', pasos: null }], apuntados)).toBe(true)
    expect(pasosDeSemana(apuntados, '2026-10-25')).toBe(8000)
    expect(pasosDeSemana(apuntados, '2026-10-26')).toBe(5000)
  })

  it('el aviso al guardar', () => {
    expect(mensajeSemana(LUNES, [{ fecha: LUNES, pasos: 60_000 }, { fecha: '2026-10-20', pasos: null }, { fecha: '2026-10-21', pasos: 3000 }])).toBe('63.000 pasos del 19–25 oct')
  })
})
