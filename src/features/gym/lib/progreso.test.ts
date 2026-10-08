import { describe, expect, it } from 'vitest'
import { datosProgreso } from './progreso'
import type { SetEntry } from '../../../shared/db/types'

const s = (id: number, over: Partial<SetEntry>): SetEntry => ({ id, workoutId: 1, exerciseId: 1, reps: 8, peso: 20, orden: id, createdAt: id, ...over })
const workouts = [{ id: 1, inicio: 100, fin: 200 }, { id: 2, inicio: 300 }]
describe('datos de progreso por modo', () => {
  it('separa calentamiento, sesión activa y modos, sin reescribir datos', () => {
    const series = [s(1, {}), s(2, { modoCarga: 'lastre', peso: 10 }), s(3, { peso: 100, tipo: 'calentamiento' }), s(4, { workoutId: 2, peso: 90 })]
    expect(datosProgreso(series, workouts, 'externa')).toEqual([{ workoutId: 1, inicio: 100, pesoMax: 20, oneRM: 25.3, asistencia: null, reps: 8, volumen: 160 }])
    expect(datosProgreso(series, workouts, 'lastre')[0]).toMatchObject({ pesoMax: 10, oneRM: null, volumen: 80 })
    expect(series[0].modoCarga).toBeUndefined()
  })
  it('corporal sin pesaje usa reps y asistencia usa mínima, ambos sin 1RM ni volumen externo', () => {
    expect(datosProgreso([s(1, { modoCarga: 'corporal', peso: 0, reps: 12 })], workouts, 'corporal')[0]).toMatchObject({ reps: 12, volumen: 0, oneRM: null })
    expect(datosProgreso([s(1, { modoCarga: 'asistencia', peso: 30 }), s(2, { modoCarga: 'asistencia', peso: 20 })], workouts, 'asistencia')[0]).toMatchObject({ asistencia: 20, oneRM: null, volumen: 0 })
    expect(datosProgreso([], workouts, 'externa')).toEqual([])
  })
})
