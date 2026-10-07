import { describe, expect, it } from 'vitest'
import type { Exercise, SetEntry, Workout } from '../../../shared/db/types'
import { resumenSemanal } from './resumenSemanal'

const dia = (iso: string, h = 10) => new Date(`${iso}T${String(h).padStart(2, '0')}:00:00`).getTime()
const ejercicios: Exercise[] = [
  { id: 1, nombre: 'Press banca', nombreNorm: 'press banca', grupo: 'Pecho', primaryMuscles: ['pecho'], secondaryMuscles: ['triceps', 'hombros'], equipment: ['barra'] },
  { id: 2, nombre: 'Misterioso', nombreNorm: 'misterioso', grupo: 'General' },
]
const w = (id: number, iso: string, minutos = 60, extra: Partial<Workout> = {}): Workout => ({ id, inicio: dia(iso), fin: dia(iso) + minutos * 60000, ...extra })
const s = (id: number, workoutId: number, exerciseId: number, reps: number, peso: number, tipo?: 'calentamiento'): SetEntry =>
  ({ id, workoutId, exerciseId, orden: id, reps, peso, createdAt: id, ...(tipo ? { tipo } : {}) })

describe('resumenSemanal', () => {
  it('cuenta sesiones, duración, series por músculo (1 y 0,5) y volumen de la semana', () => {
    const r = resumenSemanal('2026-10-05', '2026-10-11',
      [w(1, '2026-10-05'), w(2, '2026-10-09', 30), w(3, '2026-10-12'), w(4, '2026-09-30')],
      [s(1, 1, 1, 10, 50), s(2, 1, 1, 10, 50), s(3, 2, 1, 5, 60), s(4, 3, 1, 10, 100), s(5, 4, 1, 10, 100)], ejercicios)
    expect(r).toMatchObject({ sesiones: 2, duracionMs: 90 * 60000, series: 3, volumen: 10 * 50 * 2 + 300 })
    expect(r.porMusculo).toEqual([
      { musculo: 'pecho', nombre: 'Pecho', series: 3 },
      { musculo: 'hombros', nombre: 'Hombros', series: 1.5 },
      { musculo: 'triceps', nombre: 'Tríceps', series: 1.5 },
    ])
  })
  it('ignora calentamientos y entrenos sin terminar, y separa lo sin clasificar', () => {
    const r = resumenSemanal('2026-10-05', '2026-10-11',
      [w(1, '2026-10-06'), { id: 2, inicio: dia('2026-10-07') }],
      [s(1, 1, 1, 10, 20, 'calentamiento'), s(2, 1, 2, 8, 30), s(3, 2, 1, 8, 30)], ejercicios)
    expect(r).toMatchObject({ sesiones: 1, series: 1, sinClasificar: 1, volumen: 240 })
    expect(r.porMusculo).toEqual([])
  })
  it('semana vacía', () => {
    expect(resumenSemanal('2026-10-05', '2026-10-11', [], [], [])).toMatchObject({ sesiones: 0, series: 0, porMusculo: [] })
  })
})
