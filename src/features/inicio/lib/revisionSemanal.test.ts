import { describe, expect, it } from 'vitest'
import type { Exercise, Objetivos, SetEntry, Workout } from '../../../shared/db/types'
import {
  bloqueAgua, bloqueEntreno, bloqueNutricion, bloquePeso, calcularRevision, debeMostrarRevision, entrenosDeSemana, formatDiferencia,
  hayDatosSemana, recordsDeSemana, semanaAnterior, semanaARevisar, semanaDe, type DatosRevision,
} from './revisionSemanal'

// Semana revisada: lunes 5 – domingo 11 oct 2026; la anterior, 28 sep – 4 oct.
const SEMANA = semanaDe('2026-10-05')
const ANTERIOR = semanaAnterior(SEMANA)
const HOY = '2026-10-12'

const ts = (iso: string, hora = '10:00') => new Date(`${iso}T${hora}:00`).getTime()
const w = (id: number, iso: string, minutos = 60, hora = '10:00'): Workout => ({ id, inicio: ts(iso, hora), fin: ts(iso, hora) + minutos * 60000 })
const s = (id: number, workoutId: number, reps: number, peso: number, exerciseId = 1): SetEntry => ({ id, workoutId, exerciseId, orden: id, reps, peso, createdAt: id })
const e = (fecha: string, kcal: number, prot = 0) => ({ fecha, kcal, prot, carb: 0, grasa: 0 })
const obj = (kcal: number, prot = 150): Objetivos => ({ kcal, prot, carb: 200, grasa: 70 })
const ejercicios: Exercise[] = [{ id: 1, nombre: 'Press banca', nombreNorm: 'press banca', grupo: 'Pecho', primaryMuscles: ['pecho'], secondaryMuscles: ['triceps'] }]

describe('semanas', () => {
  it('se revisa la semana cerrada anterior a hoy, de lunes a domingo', () => {
    for (const hoy of ['2026-10-12', '2026-10-15', '2026-10-18']) expect(semanaARevisar(hoy)).toMatchObject({ lunes: '2026-10-05', domingo: '2026-10-11' })
    expect(semanaARevisar('2026-10-11').lunes).toBe('2026-09-28')
    expect(SEMANA.fechas).toHaveLength(7)
    expect(ANTERIOR).toMatchObject({ lunes: '2026-09-28', domingo: '2026-10-04' })
  })

  it('la tarjeta sale con datos y hasta que se cierra esa semana; vuelve con la siguiente', () => {
    expect(debeMostrarRevision('2026-10-05', undefined, true)).toBe(true)
    expect(debeMostrarRevision('2026-10-05', '2026-09-28', true)).toBe(true)
    expect(debeMostrarRevision('2026-10-05', '2026-10-05', true)).toBe(false)
    expect(debeMostrarRevision('2026-10-05', undefined, false)).toBe(false)
  })

  it('un entreno cuenta por su día de inicio y solo si está terminado', () => {
    const domingoNoche = w(1, '2026-10-11', 90, '23:30')
    const lunesTemprano = w(2, '2026-10-12', 60, '00:10')
    const sinTerminar: Workout = { id: 3, inicio: ts('2026-10-07') }
    expect(entrenosDeSemana(SEMANA, [domingoNoche, lunesTemprano, sinTerminar]).map((x) => x.id)).toEqual([1])
  })

  it('hay datos con cualquier registro de la semana, no de otra', () => {
    const vacio = { entries: [], pesos: [], agua: [], workouts: [] }
    expect(hayDatosSemana(SEMANA, vacio)).toBe(false)
    expect(hayDatosSemana(SEMANA, { ...vacio, entries: [{ fecha: '2026-10-04' }] })).toBe(false)
    expect(hayDatosSemana(SEMANA, { ...vacio, entries: [{ fecha: '2026-10-11' }] })).toBe(true)
    expect(hayDatosSemana(SEMANA, { ...vacio, pesos: [{ fecha: '2026-10-05' }] })).toBe(true)
    expect(hayDatosSemana(SEMANA, { ...vacio, agua: [{ fecha: '2026-10-06', ml: 0 }] })).toBe(false)
    expect(hayDatosSemana(SEMANA, { ...vacio, agua: [{ fecha: '2026-10-06', ml: 250 }] })).toBe(true)
    expect(hayDatosSemana(SEMANA, { ...vacio, workouts: [{ inicio: ts('2026-10-08') }] })).toBe(false)
    expect(hayDatosSemana(SEMANA, { ...vacio, workouts: [w(1, '2026-10-08')] })).toBe(true)
  })
})

describe('bloquePeso', () => {
  it('media de los pesajes de la semana frente a la de la anterior', () => {
    const pesos = [{ fecha: '2026-09-29', kg: 80 }, { fecha: '2026-10-02', kg: 79.6 }, { fecha: '2026-10-06', kg: 79.4 }, { fecha: '2026-10-09', kg: 79 }, { fecha: '2026-10-12', kg: 70 }]
    expect(bloquePeso(SEMANA, ANTERIOR, pesos)).toEqual({ media: 79.2, pesajes: 2, diferencia: -0.6 })
  })

  it('sin pesajes en alguna de las dos semanas no hay diferencia', () => {
    expect(bloquePeso(SEMANA, ANTERIOR, [{ fecha: '2026-10-06', kg: 79 }])).toEqual({ media: 79, pesajes: 1, diferencia: null })
    expect(bloquePeso(SEMANA, ANTERIOR, [{ fecha: '2026-10-01', kg: 79 }])).toEqual({ media: null, pesajes: 0, diferencia: null })
  })
})

describe('bloqueNutricion', () => {
  const objetivos = new Map(SEMANA.fechas.map((f) => [f, obj(f === '2026-10-05' ? 2000 : 2200)]))

  it('medias de los días registrados frente a la media de sus propios objetivos; los días vacíos no cuentan', () => {
    const entries = [e('2026-10-05', 1000, 60), e('2026-10-05', 1000, 60), e('2026-10-06', 2600, 150), e('2026-09-30', 1900)]
    const b = bloqueNutricion(SEMANA, ANTERIOR, entries, objetivos, HOY)
    expect(b).toMatchObject({ diasRegistrados: 2, kcalMedia: 2300, protMedia: 135, kcalObjetivo: 2100, protObjetivo: 150 })
    // 5 oct: 2000 de 2000 (en rango); 6 oct: 2600 de 2200 (fuera de ±10 %).
    expect(b).toMatchObject({ adherencia: 50, diasEnRango: 1, diferenciaKcal: 400 })
  })

  it('semana sin registros: sin medias, objetivo, adherencia ni diferencia', () => {
    expect(bloqueNutricion(SEMANA, ANTERIOR, [e('2026-09-30', 1900)], objetivos, HOY)).toEqual({
      diasRegistrados: 0, kcalMedia: null, protMedia: null, kcalObjetivo: null, protObjetivo: null, adherencia: null, diasEnRango: 0, diferenciaKcal: null,
    })
  })

  it('sin objetivo de kcal no inventa uno', () => {
    const b = bloqueNutricion(SEMANA, ANTERIOR, [e('2026-10-07', 1800)], new Map([['2026-10-07', obj(0, 0)]]), HOY)
    expect(b).toMatchObject({ kcalMedia: 1800, kcalObjetivo: null, protObjetivo: null, adherencia: 0 })
  })
})

describe('bloqueEntreno y récords', () => {
  const workouts = [w(1, '2026-09-30'), w(2, '2026-10-06', 45), w(3, '2026-10-09', 75), { id: 4, inicio: ts('2026-10-10') }]
  const sets = [s(1, 1, 8, 80), s(2, 2, 8, 85), s(3, 2, 8, 85), s(4, 3, 10, 85), s(5, 4, 5, 200)]

  it('resume la semana y la anterior con el mismo criterio que Gym y destaca los grupos con más series', () => {
    const b = bloqueEntreno(SEMANA, ANTERIOR, workouts, sets, ejercicios)
    expect(b.actual).toMatchObject({ sesiones: 2, series: 3, duracionMs: 120 * 60000 })
    expect(b.anterior).toMatchObject({ sesiones: 1, series: 1 })
    expect(b.destacados.map((g) => g.musculo)).toEqual(['pecho', 'triceps'])
  })

  it('récords de los entrenos terminados de la semana, cada uno frente a los anteriores a él', () => {
    const r = recordsDeSemana(SEMANA, workouts, sets)
    expect(r.map((x) => [x.tipo, x.valor])).toEqual([['peso', 85], ['1rm', expect.any(Number)], ['1rm', expect.any(Number)], ['reps', 10]])
    expect(r.some((x) => x.valor === 200)).toBe(false)
  })
})

describe('bloqueAgua', () => {
  const agua = [{ fecha: '2026-10-05', ml: 2000 }, { fecha: '2026-10-06', ml: 1500 }, { fecha: '2026-10-07', ml: 0 }, { fecha: '2026-10-04', ml: 3000 }]
  it('media de los días con agua y días en el objetivo', () => {
    expect(bloqueAgua(SEMANA, agua, 2000)).toEqual({ dias: 2, mediaMl: 1750, diasEnObjetivo: 1, objetivoMl: 2000 })
  })
  it('sin objetivo no cuenta días en objetivo', () => {
    expect(bloqueAgua(SEMANA, agua, null).diasEnObjetivo).toBeNull()
    expect(bloqueAgua(SEMANA, [], 2000)).toEqual({ dias: 0, mediaMl: null, diasEnObjetivo: 0, objetivoMl: 2000 })
  })
})

describe('calcularRevision', () => {
  const vacio: DatosRevision = { entries: [], objetivos: new Map(), pesos: [], agua: [], objetivoAguaMl: null, workouts: [], sets: [], exercises: [] }
  it('semana vacía: sin datos y bloques vacíos', () => {
    const r = calcularRevision('2026-10-05', vacio, HOY)
    expect(r.hayDatos).toBe(false)
    expect(r.semana.domingo).toBe('2026-10-11')
    expect(r.entreno.actual.sesiones).toBe(0)
    expect(r.records).toEqual([])
  })
  it('acepta cualquier día como ancla y revisa su semana', () => {
    expect(calcularRevision('2026-10-08', { ...vacio, pesos: [{ fecha: '2026-10-08', kg: 80 }] }, HOY)).toMatchObject({ hayDatos: true, semana: { lunes: '2026-10-05' } })
  })
})

describe('formatDiferencia', () => {
  it('signo tipográfico, decimales y unidad; cero sin signo', () => {
    expect(formatDiferencia(-0.6, 1, 'kg')).toBe('−0,6 kg')
    expect(formatDiferencia(1200, 0, 'kcal')).toBe('+1.200 kcal')
    expect(formatDiferencia(2)).toBe('+2')
    expect(formatDiferencia(0.04, 1, 'kg')).toBe('Sin cambios')
    expect(formatDiferencia(-0.04, 1)).toBe('Sin cambios')
  })
})
