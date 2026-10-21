import { describe, expect, it } from 'vitest'
import { epley1RM } from './workout'
import { cifrasClave, datosProgreso, filasPorGimnasio, gimnasiosConSesiones, resumenEjercicios, resumenVariantes, tendenciaVariante, textoMejorSerie, trazoMini } from './progreso'
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

describe('lista de ejercicios de Progreso', () => {
  const ws = [{ id: 1, inicio: 100, fin: 200 }, { id: 2, inicio: 300, fin: 400 }, { id: 3, inicio: 500 }]
  it('cada ejercicio con sesiones terminadas, su última mejor serie y su tendencia; el más reciente primero', () => {
    const r = resumenEjercicios([
      s(1, { peso: 80, reps: 5 }), s(2, { workoutId: 2, peso: 85, reps: 5 }), s(3, { workoutId: 3, peso: 90, reps: 5 }),
      s(4, { exerciseId: 2, modoCarga: 'corporal', peso: 0, reps: 10 }),
      s(5, { exerciseId: 3, workoutId: 3, peso: 50 }),
    ], ws)
    expect(r.map(e => e.exerciseId)).toEqual([1, 2])
    expect(r[0]).toMatchObject({ modo: 'externa', metrica: 'oneRM', sesiones: 2, ultima: { mejor: { peso: 85, reps: 5 } } })
    expect(r[0].puntos).toHaveLength(2)
    expect(r[1]).toMatchObject({ modo: 'corporal', metrica: 'reps', puntos: [10] })
  })
  it('la tendencia de la lista es la del habitual aunque la primera sesión fuera en otro gimnasio', () => {
    const r = resumenEjercicios([s(1, { peso: 150, reps: 5, gimnasioId: 4 }), s(2, { workoutId: 2, peso: 85, reps: 5 })], ws)
    expect(r[0]).toMatchObject({ sesiones: 1, ultima: { mejor: { peso: 85 } } })
  })
  it('cada sesión dice su gimnasio (del entreno) y se puede filtrar uno; la variante no depende del gimnasio', () => {
    const wsG = [{ id: 1, inicio: 100, fin: 200 }, { id: 2, inicio: 300, fin: 400, gimnasioId: 7 }, { id: 3, inicio: 500, fin: 600, gimnasioId: 3 }]
    const series = [s(1, { peso: 100, reps: 5 }), s(2, { workoutId: 2, peso: 60, reps: 5, gimnasioId: 7 }), s(3, { workoutId: 3, peso: 102.5, reps: 5 })]
    const todos = datosProgreso(series, wsG, 'externa')
    expect(todos.map(d => [d.workoutId, d.gimnasioId])).toEqual([[1, undefined], [2, 7], [3, 3]])
    expect(datosProgreso(series, wsG, 'externa', undefined, { gimnasioId: undefined }).map(d => d.workoutId)).toEqual([1])
    expect(datosProgreso(series, wsG, 'externa', undefined, { gimnasioId: 7 }).map(d => d.pesoMax)).toEqual([60])
    expect(gimnasiosConSesiones(todos)).toEqual([undefined, 3, 7])
  })
  it('filasPorGimnasio pone el valor de cada sesión en la columna de su gimnasio', () => {
    const datos = [{ gimnasioId: undefined, pesoMax: 100, oneRM: null, volumen: 1, reps: 5, asistencia: null }, { gimnasioId: 7, pesoMax: 60, oneRM: null, volumen: 1, reps: 5, asistencia: null }]
    const filas = filasPorGimnasio(datos, 'pesoMax', [undefined, 7])
    expect([filas[0].g0, filas[0].g1, filas[1].g0, filas[1].g1]).toEqual([100, undefined, undefined, 60])
    expect(filasPorGimnasio(datos, 'pesoMax', [undefined])[1].g0).toBeUndefined()
  })
  it('trazoMini ciñe la línea a su mínimo y máximo', () => {
    expect(trazoMini([1], 64, 24)).toBeNull()
    expect(trazoMini([10, 20, 15], 64, 24)).toEqual({ d: 'M2 22L32 2L62 12', ultimo: { x: 62, y: 12 } })
  })
})

describe('tarjetas de variante', () => {
  const ws = [{ id: 1, inicio: 100, fin: 200 }, { id: 2, inicio: 300, fin: 400 }, { id: 3, inicio: 500, fin: 600, gimnasioId: 7 }, { id: 4, inicio: 700, fin: 800 }, { id: 5, inicio: 900 }]
  const neutro = { orientacion: 'neutro' as const }
  it('una tarjeta por variante con sesiones terminadas, la de más sesiones primero', () => {
    const r = resumenVariantes([
      s(1, { peso: 60, reps: 5, agarre: neutro }), s(2, { workoutId: 2, peso: 65, reps: 5, agarre: neutro }), s(3, { workoutId: 3, peso: 50, reps: 5, agarre: neutro, gimnasioId: 7 }),
      s(4, { workoutId: 4, peso: 40, reps: 8 }),
      s(5, { workoutId: 5, peso: 99, reps: 1, agarre: { orientacion: 'prono' } }),
    ], ws, 'externa')
    expect(r.map(v => [v.serie.agarre?.orientacion, v.sesiones, v.gimnasios])).toEqual([['neutro', 3, 2], [undefined, 1, 1]])
    // La tendencia es la del habitual (60 → 65 kg × 5); la mejor marca, de cualquier gimnasio.
    expect(r[0]).toMatchObject({ metrica: 'oneRM', cambio: epley1RM(65, 5) - epley1RM(60, 5), desde: 100, ultima: 500 })
    expect(r[0].puntos).toHaveLength(2)
    expect(r[1]).toMatchObject({ cambio: null, puntos: [epley1RM(40, 8)] })
  })
  it('con asistencia la mejor marca es la menor ayuda', () => {
    const r = resumenVariantes([s(1, { modoCarga: 'asistencia', peso: 30 }), s(2, { workoutId: 2, modoCarga: 'asistencia', peso: 20 })], ws, 'asistencia')
    expect(r[0]).toMatchObject({ metrica: 'asistencia', mejor: 20, cambio: -10 })
  })
  it('tendencia con signo, unidad y si mejora (con asistencia, bajar es mejorar)', () => {
    const desde = new Date(2026, 5, 3).getTime()
    expect(tendenciaVariante({ cambio: 12, metrica: 'oneRM', desde })).toEqual({ texto: '+12 kg desde el 3 jun', mejora: true })
    expect(tendenciaVariante({ cambio: -2.5, metrica: 'pesoMax', desde })).toEqual({ texto: '−2,5 kg desde el 3 jun', mejora: false })
    expect(tendenciaVariante({ cambio: -5, metrica: 'asistencia', desde }).mejora).toBe(true)
    expect(tendenciaVariante({ cambio: 2, metrica: 'reps', desde }).texto).toBe('+2 reps desde el 3 jun')
    expect(tendenciaVariante({ cambio: 0, metrica: 'oneRM', desde })).toEqual({ texto: 'Sin cambios desde el 3 jun', mejora: null })
    expect(tendenciaVariante({ cambio: null, metrica: 'oneRM', desde }).mejora).toBeNull()
  })
})
