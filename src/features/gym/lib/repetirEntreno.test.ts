import { describe, expect, it } from 'vitest'
import type { SetEntry } from '../../../shared/db/types'
import { ejerciciosDelEntreno, rutinaDesdeEntreno, seriesHechas, seriesParaRepetir } from './repetirEntreno'

let id = 0
const serie = (exerciseId: number, orden: number, datos: Partial<SetEntry> = {}): SetEntry =>
  ({ id: ++id, workoutId: 1, exerciseId, orden, reps: 8, peso: 50, createdAt: id, ...datos })

describe('ejerciciosDelEntreno', () => {
  it('sigue el orden manual de la sesión y, si no hay, el de las series', () => {
    const sets = [serie(2, 0), serie(1, 0), serie(2, 1)]
    expect(ejerciciosDelEntreno({}, sets)).toEqual([2, 1])
    expect(ejerciciosDelEntreno({ ordenEjercicios: [1, 2] }, sets)).toEqual([1, 2])
  })

  it('no incluye los omitidos ni los que no tienen series', () => {
    expect(ejerciciosDelEntreno({ ordenEjercicios: [3, 1, 2], ejerciciosOmitidos: [2] }, [serie(1, 0), serie(2, 0)])).toEqual([1])
  })
})

describe('seriesHechas', () => {
  it('deja fuera las pendientes salvo que el ejercicio solo tenga pendientes', () => {
    const sets = [serie(1, 1, { realizada: false }), serie(1, 0, { realizada: true }), serie(2, 0, { realizada: false })]
    expect(seriesHechas(sets, 1).map(s => s.orden)).toEqual([0])
    expect(seriesHechas(sets, 2)).toHaveLength(1)
  })
})

describe('seriesParaRepetir', () => {
  it('copia ejercicios, orden, calentamientos y cifras, sin RIR ni confirmación', () => {
    const sets = [
      serie(1, 0, { tipo: 'calentamiento', reps: 12, peso: 20, realizada: true }),
      serie(1, 1, { reps: 8, peso: 60, rir: 2, realizada: true }),
      serie(1, 2, { reps: 6, peso: 60, realizada: false }),
      serie(2, 0, { reps: 10, peso: 15, realizada: true, agarre: { orientacion: 'neutro' } }),
    ]
    const nuevas = seriesParaRepetir({}, sets)
    expect(nuevas.map(s => [s.exerciseId, s.orden, s.tipo, s.reps, s.peso])).toEqual([
      [1, 0, 'calentamiento', 12, 20], [1, 1, undefined, 8, 60], [2, 0, undefined, 10, 15],
    ])
    for (const s of nuevas) {
      expect(s).not.toHaveProperty('rir')
      expect(s).not.toHaveProperty('realizada')
      expect(s).not.toHaveProperty('id')
    }
    expect(nuevas[2].agarre).toEqual({ orientacion: 'neutro' })
  })

  it('quita el RIR de los lados y las bajadas y conserva sus cifras', () => {
    const [nueva] = seriesParaRepetir({}, [serie(1, 0, {
      ejecucion: 'lados', lados: { izquierda: { reps: 8, peso: 10, rir: 1 }, derecha: { reps: 7, peso: 10, rir: 0 } },
      bajadas: [{ id: 'b1', reps: 5, peso: 30, lados: { izquierda: { reps: 4, peso: 8, rir: 0 } } }],
    })])
    expect(nueva.lados).toEqual({ izquierda: { reps: 8, peso: 10 }, derecha: { reps: 7, peso: 10 } })
    expect(nueva.bajadas).toEqual([{ id: 'b1', reps: 5, peso: 30, lados: { izquierda: { reps: 4, peso: 8 } } }])
  })

  it('actualiza la masa corporal al último pesaje y, sin pesajes, conserva la de ese día', () => {
    const sets = [serie(1, 0, { modoCarga: 'lastre', peso: 10, pesoCorporal: 80 }), serie(2, 0, { peso: 40 })]
    expect(seriesParaRepetir({}, sets, 78).map(s => s.pesoCorporal)).toEqual([78, undefined])
    expect(seriesParaRepetir({}, sets).map(s => s.pesoCorporal)).toEqual([80, undefined])
  })
})

describe('rutinaDesdeEntreno', () => {
  it('objetivo por ejercicio con series efectivas, rango de reps y calentamientos; agarres de la sesión', () => {
    const sets = [
      serie(1, 0, { tipo: 'calentamiento', reps: 12 }),
      serie(1, 1, { reps: 10 }),
      serie(1, 2, { reps: 8 }),
      serie(1, 3, { reps: 9 }),
      serie(2, 0, { reps: 12 }),
      serie(2, 1, { reps: 12, realizada: false }),
    ]
    const r = rutinaDesdeEntreno({ ordenEjercicios: [2, 1], ejecucionesEjercicios: { 2: { ejecucion: 'bilateral', agarre: { accesorio: 'cuerda' } } } }, sets)
    expect(r).toEqual({
      exerciseIds: [2, 1],
      objetivos: { 1: { series: 3, repsMin: 8, repsMax: 10, calentamientos: 1 }, 2: { series: 1, repsMin: 12, repsMax: 12 } },
      agarres: { 2: { accesorio: 'cuerda' } },
    })
  })

  it('las series por lados aportan las reps de cada lado', () => {
    const r = rutinaDesdeEntreno({}, [serie(1, 0, { ejecucion: 'lados', reps: 0, lados: { izquierda: { reps: 8, peso: 10 }, derecha: { reps: 10, peso: 10 } } })])
    expect(r.objetivos?.[1]).toEqual({ series: 1, repsMin: 8, repsMax: 10 })
  })

  it('un ejercicio solo con calentamientos o sin reps queda sin objetivo; las series se limitan a 10', () => {
    const sets = [serie(1, 0, { tipo: 'calentamiento' }), serie(2, 0, { reps: 0 })]
    for (let i = 0; i < 12; i++) sets.push(serie(3, i))
    const r = rutinaDesdeEntreno({}, sets)
    expect(r.exerciseIds).toEqual([1, 2, 3])
    expect(r.objetivos).toEqual({ 3: { series: 10, repsMin: 8, repsMax: 8 } })
    expect(r).not.toHaveProperty('agarres')
  })
})
