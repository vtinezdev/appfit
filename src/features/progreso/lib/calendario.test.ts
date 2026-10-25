import { describe, expect, it } from 'vitest'
import { calendarioRegistros, conRegistros, resumenDia } from './calendario'

const ts = (iso: string, hora = '10:00') => new Date(`${iso}T${hora}:00`).getTime()

describe('calendario de registros (B14)', () => {
  const semanas = calendarioRegistros('2026-10-01', {
    workouts: [{ id: 1, inicio: ts('2026-10-05'), fin: ts('2026-10-05') + 3600000 }, { id: 2, inicio: ts('2026-10-05', '19:00'), fin: ts('2026-10-05', '20:00') }, { id: 3, inicio: ts('2026-10-06') }],
    actividades: [{ id: 7, fecha: '2026-10-05', inicio: ts('2026-10-05', '08:00') }, { id: 8, fecha: '2026-10-09', inicio: ts('2026-10-09'), enCurso: true }],
    entries: [{ fecha: '2026-10-05', kcal: 600.4, prot: 40.2 }, { fecha: '2026-10-05', kcal: 900, prot: 60 }, { fecha: '2026-09-30', kcal: 500, prot: 30 }],
    pesos: [{ fecha: '2026-10-07', kg: 78.4 }],
    agua: [{ fecha: '2026-10-07', ml: 250 }, { fecha: '2026-10-07', ml: 500 }],
  }, '2026-10-08')
  const dia = (f: string) => semanas.flat().find((d) => d.fecha === f)!

  it('semanas de lunes a domingo con los días de relleno vacíos', () => {
    expect(semanas[0][0].fecha).toBe('2026-09-28')
    expect(semanas.every((s) => s.length === 7)).toBe(true)
    expect(dia('2026-09-30')).toMatchObject({ delMes: false, comidas: 0 })
  })

  it('cada día con sus entrenos terminados, actividades, comidas, peso y agua', () => {
    expect(dia('2026-10-05')).toMatchObject({ entrenos: [1, 2], actividades: [7], kcal: 1500, prot: 100, comidas: 2 })
    expect(dia('2026-10-06').entrenos).toEqual([])
    expect(dia('2026-10-09').actividades).toEqual([])
    expect(dia('2026-10-07')).toMatchObject({ peso: 78.4, aguaMl: 750, hoy: false, futuro: false })
    expect(dia('2026-10-08').hoy).toBe(true)
    expect(dia('2026-10-20').futuro).toBe(true)
  })

  it('resumen para el lector de pantalla', () => {
    expect(resumenDia(dia('2026-10-05'))).toBe('2 entrenos, 1 actividad y comidas')
    expect(resumenDia(dia('2026-10-07'))).toBe('peso y agua')
    expect(resumenDia(dia('2026-10-10'))).toBe('sin registros')
    expect(conRegistros(dia('2026-10-10'))).toBe(false)
  })
})
