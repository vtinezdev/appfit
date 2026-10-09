import { describe, expect, it } from 'vitest'
import { cifrasClave, datosProgreso, textoMejorSerie } from './progreso'
import type { SetEntry } from '../../../shared/db/types'

const s = (id: number, over: Partial<SetEntry>): SetEntry => ({ id, workoutId: 1, exerciseId: 1, reps: 8, peso: 20, orden: id, createdAt: id, ...over })
const workouts = [{ id: 1, inicio: 100, fin: 200 }, { id: 2, inicio: 300 }]
describe('datos de progreso por modo', () => {
  it('separa calentamiento, sesión activa y modos, sin reescribir datos', () => {
    const series = [s(1, {}), s(2, { modoCarga: 'lastre', peso: 10 }), s(3, { peso: 100, tipo: 'calentamiento' }), s(4, { workoutId: 2, peso: 90 })]
    expect(datosProgreso(series, workouts, 'externa')).toEqual([{ workoutId: 1, inicio: 100, pesoMax: 20, oneRM: 25.3, asistencia: null, reps: 8, volumen: 160, mejor: { peso: 20, reps: 8 } }])
    expect(datosProgreso(series, workouts, 'lastre')[0]).toMatchObject({ pesoMax: 10, oneRM: null, volumen: 80 })
    expect(series[0].modoCarga).toBeUndefined()
  })
  it('corporal sin pesaje usa reps y asistencia usa mínima, ambos sin 1RM ni volumen externo', () => {
    expect(datosProgreso([s(1, { modoCarga: 'corporal', peso: 0, reps: 12 })], workouts, 'corporal')[0]).toMatchObject({ reps: 12, volumen: 0, oneRM: null })
    expect(datosProgreso([s(1, { modoCarga: 'asistencia', peso: 30 }), s(2, { modoCarga: 'asistencia', peso: 20 })], workouts, 'asistencia')[0]).toMatchObject({ asistencia: 20, oneRM: null, volumen: 0 })
    expect(datosProgreso([], workouts, 'externa')).toEqual([])
  })
})

describe('mejor serie y cifras clave', () => {
  const ws = [{ id: 1, inicio: 100, fin: 200 }, { id: 2, inicio: 300, fin: 400 }, { id: 3, inicio: 500, fin: 600 }]
  it('la mejor serie es la de más carga y, a igual carga, más reps', () => {
    const datos = datosProgreso([s(1, { peso: 80, reps: 8 }), s(2, { peso: 85, reps: 5 }), s(3, { peso: 85, reps: 6 }), s(4, { workoutId: 2, peso: 90, reps: 3 }), s(5, { workoutId: 3, peso: 82.5, reps: 8 })], ws, 'externa')
    expect(datos.map(d => d.mejor)).toEqual([{ peso: 85, reps: 6 }, { peso: 90, reps: 3 }, { peso: 82.5, reps: 8 }])
    const c = cifrasClave(datos, 'pesoMax', 'externa')!
    expect(c.mejor).toMatchObject({ peso: 90, reps: 3, inicio: 300 })
    expect(c.oneRM).toBeCloseTo(104.5, 1)
    expect(c.cambio).toBe(-2.5)
    expect(textoMejorSerie(c.mejor, 'externa')).toBe('90 kg × 3')
  })
  it('asistencia: menos ayuda es mejor; corporal: más reps; una sola sesión no tiene cambio', () => {
    const asist = datosProgreso([s(1, { modoCarga: 'asistencia', peso: 30, reps: 8 }), s(2, { modoCarga: 'asistencia', peso: 20, reps: 5 })], ws, 'asistencia')
    expect(asist[0].mejor).toEqual({ peso: 20, reps: 5 })
    expect(textoMejorSerie(asist[0].mejor, 'asistencia')).toBe('−20 kg × 5')
    const corp = datosProgreso([s(1, { modoCarga: 'corporal', peso: 0, reps: 10 }), s(2, { modoCarga: 'corporal', peso: 0, reps: 12 })], ws, 'corporal')
    expect(textoMejorSerie(corp[0].mejor, 'corporal')).toBe('12 reps')
    expect(cifrasClave(corp, 'reps', 'corporal')).toMatchObject({ cambio: null, oneRM: null })
    expect(cifrasClave([], 'reps', 'corporal')).toBeNull()
  })
})
