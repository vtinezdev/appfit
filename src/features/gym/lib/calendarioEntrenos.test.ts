import { describe, expect, it } from 'vitest'
import { calendarioMes, nivelVolumen } from './calendarioEntrenos'

const ts = (iso: string, h = 18) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d, h).getTime() }

describe('nivelVolumen', () => {
  it('cuantiza en cinco niveles respecto al máximo y nunca deja un día entrenado en 0', () => {
    expect(nivelVolumen(10000, 10000)).toBe(5)
    expect(nivelVolumen(5000, 10000)).toBe(3)
    expect(nivelVolumen(1, 10000)).toBe(1)
    expect(nivelVolumen(0, 10000)).toBe(1)
    expect(nivelVolumen(0, 0)).toBe(1)
  })
})

describe('calendarioMes', () => {
  const workouts = [
    { id: 1, inicio: ts('2026-10-01'), fin: ts('2026-10-01', 19) },
    { id: 2, inicio: ts('2026-10-05', 8), fin: ts('2026-10-05', 9) },
    { id: 3, inicio: ts('2026-10-05', 19), fin: ts('2026-10-05', 20) },
    { id: 4, inicio: ts('2026-09-30'), fin: ts('2026-09-30', 19) },
    { id: 5, inicio: ts('2026-10-07') },
  ]
  const volumen: Record<number, number> = { 1: 2000, 2: 3000, 3: 1000, 4: 9000, 5: 9000 }
  const semanas = calendarioMes('2026-10-15', workouts, id => volumen[id], '2026-10-09')
  const dia = (f: string) => semanas.flat().find(d => d.fecha === f)!

  it('semanas de lunes a domingo que cubren el mes, con relleno vacío', () => {
    expect(semanas).toHaveLength(5)
    expect(semanas[0][0].fecha).toBe('2026-09-28')
    expect(semanas[4][6].fecha).toBe('2026-11-01')
    expect(dia('2026-09-30')).toMatchObject({ delMes: false, workoutIds: [], nivel: 0 })
  })
  it('suma los entrenos terminados del día y cuantiza respecto al día de más volumen del mes', () => {
    expect(dia('2026-10-05')).toMatchObject({ workoutIds: [3, 2], volumen: 4000, nivel: 5 })
    expect(dia('2026-10-01')).toMatchObject({ workoutIds: [1], nivel: 3 })
    // El activo (sin fin) no cuenta.
    expect(dia('2026-10-07')).toMatchObject({ workoutIds: [], nivel: 0 })
  })
  it('marca hoy y los días futuros', () => {
    expect(dia('2026-10-09')).toMatchObject({ hoy: true, futuro: false })
    expect(dia('2026-10-10')).toMatchObject({ hoy: false, futuro: true })
  })
})
