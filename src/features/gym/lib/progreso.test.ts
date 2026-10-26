import { describe, expect, it } from 'vitest'
import { epley1RM } from './workout'
import { cifrasClave, datosProgreso, marcasSesiones, historialEjercicio, filasPorGimnasio, gimnasiosConSesiones, resumenEjercicios, resumenVariantes, tendenciaVariante, textoMejorSerie, trazoMini } from './progreso'
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

describe('historial del ejercicio en la sesión', () => {
  // Siete sesiones terminadas de press banca (ejercicio 1), una sin terminar, la actual (99) y una posterior.
  const ws = [...Array.from({ length: 7 }, (_, i) => ({ id: 10 + i, inicio: 1000 * (i + 1), fin: 1000 * (i + 1) + 500 })),
    { id: 30, inicio: 7500 }, { id: 99, inicio: 9000 }, { id: 40, inicio: 9500, fin: 9900 }]
  const series = [
    ...ws.slice(0, 7).flatMap((w, i) => [
      s(100 + i * 10, { workoutId: w.id, peso: 20, reps: 12, tipo: 'calentamiento' }),
      s(101 + i * 10, { workoutId: w.id, peso: 60 + i * 2.5, reps: 8, rir: 2 }),
      s(102 + i * 10, { workoutId: w.id, peso: 60 + i * 2.5, reps: 7, rir: 1 }),
      s(103 + i * 10, { workoutId: w.id, peso: 200, reps: 8, realizada: false }),
    ]),
    s(300, { workoutId: 30, peso: 300 }), s(400, { workoutId: 40, peso: 400 }), s(990, { workoutId: 99, peso: 500 }),
    // Otras variantes y modos del mismo ejercicio, y otro ejercicio: no se mezclan.
    s(500, { workoutId: 16, peso: 90, ejecucion: 'unilateral' }), s(501, { workoutId: 16, peso: 0, reps: 20, modoCarga: 'corporal' }), s(502, { workoutId: 16, exerciseId: 2, peso: 150 }),
  ]

  it('las 5 últimas sesiones comparables, la más reciente primero, sin calentamientos, pendientes ni la sesión en curso', () => {
    const h = historialEjercicio(series, ws, { exerciseId: 1 }, 9000)!
    expect(h.total).toBe(7)
    expect(h.sesiones.map(x => x.workoutId)).toEqual([16, 15, 14, 13, 12])
    expect(h.sesiones[0]).toEqual({ workoutId: 16, inicio: 7000, mejor: { peso: 75, reps: 8 }, series: 2, rirMedio: 1.5 })
    expect(h.puntos).toHaveLength(7)
    expect(h.mide).toBe('Mejor 1RM estimado')
    expect(h.puntos.at(-1)).toBe(epley1RM(75, 8))
    expect(historialEjercicio(series, ws, { exerciseId: 1 }, 9000, 5, 3)!.puntos).toEqual([epley1RM(70, 8), epley1RM(72.5, 8), epley1RM(75, 8)])
  })

  it('récords vigentes: peso máximo, 1RM y reps con el peso de la serie de referencia', () => {
    const h = historialEjercicio(series, ws, { exerciseId: 1, peso: 72.5 }, 9000)!
    expect(h.records).toEqual([
      { etiqueta: 'Peso máximo', texto: '75 kg × 8', inicio: 7000 },
      { etiqueta: '1RM estimado', texto: '95 kg', inicio: 7000 },
      { etiqueta: 'Más reps con 72,5 kg', texto: '8 reps', inicio: 6000 },
    ])
    // Un peso que nunca se usó no da récord de reps.
    expect(historialEjercicio(series, ws, { exerciseId: 1, peso: 80 }, 9000)!.records.map(r => r.etiqueta)).toEqual(['Peso máximo', '1RM estimado'])
  })

  it('variantes, modos y gimnasios de máquina no se mezclan; sin historial comparable, null', () => {
    const unilateral = historialEjercicio(series, ws, { exerciseId: 1, ejecucion: 'unilateral' }, 9000)!
    expect(unilateral.sesiones.map(x => x.mejor)).toEqual([{ peso: 90, reps: 8 }])
    expect(unilateral.records.map(r => r.etiqueta)).toEqual(['Peso máximo'])
    const corporal = historialEjercicio(series, ws, { exerciseId: 1, modoCarga: 'corporal' }, 9000)!
    expect(corporal.records).toEqual([{ etiqueta: 'Más repeticiones', texto: '20 reps', inicio: 7000 }])
    expect(historialEjercicio(series, ws, { exerciseId: 1, gimnasioId: 7 }, 9000)).toBeNull()
    expect(historialEjercicio(series, ws, { exerciseId: 3 }, 9000)).toBeNull()
    expect(historialEjercicio(series, ws, { exerciseId: 1 }, 1000)).toBeNull()
  })
})

describe('sesiones de un ejercicio (punto 40)', () => {
  it('récord si supera a todas las anteriores, cambio frente a la anterior y barra con base bajo la peor', () => {
    const m = marcasSesiones([100, 95, 98, 90])
    expect(m.map((x) => x.record)).toEqual([true, false, true, false])
    expect(m.map((x) => x.cambio)).toEqual([5, -3, 8, null])
    expect(m[0].ancho).toBe(100)
    expect(m[3].ancho).toBeGreaterThanOrEqual(8)
    expect(m[3].ancho).toBeLessThan(m[1].ancho)
    expect(marcasSesiones([80]).map((x) => [x.record, x.cambio])).toEqual([[false, null]])
  })
})
