import { describe, expect, it } from 'vitest'
import type { SetEntry } from '../../../shared/db/types'
import { anterioresPorSerie, diasDesdeUltimaSesion, seriesSesionAnterior, textoAnterior, trasParon } from './anterior'

const s = (id: number, over: Partial<SetEntry> = {}): SetEntry => ({ id, workoutId: 1, exerciseId: 1, orden: id, reps: 8, peso: 60, createdAt: id, ...over })

describe('textoAnterior', () => {
  it('reps × kg según el modo de carga', () => {
    expect(textoAnterior({}, 8, 72.5)).toEqual({ texto: '8 × 72,5', etiqueta: '8 repeticiones con 72,5 kg' })
    expect(textoAnterior({ modoCarga: 'lastre' }, 6, 10)?.texto).toBe('6 × +10')
    expect(textoAnterior({ modoCarga: 'asistencia' }, 1, 20)).toEqual({ texto: '1 × −20', etiqueta: '1 repetición con 20 kg de ayuda' })
    expect(textoAnterior({ modoCarga: 'corporal' }, 12, 0)?.texto).toBe('12 reps')
    expect(textoAnterior({}, 0, 60)).toBeUndefined()
  })
})

describe('anterioresPorSerie', () => {
  it('empareja calentamientos con calentamientos y efectivas por su número', () => {
    const previas = [s(10, { tipo: 'calentamiento', peso: 20, workoutId: 2 }), s(11, { peso: 60, workoutId: 2 }), s(12, { peso: 62.5, reps: 6, workoutId: 2 })]
    const actuales = [s(1, { tipo: 'calentamiento' }), s(2, { tipo: 'calentamiento' }), s(3), s(4), s(5)]
    const r = anterioresPorSerie(actuales, previas)
    expect(r.get(1)?.fila?.texto).toBe('8 × 20')
    expect(r.has(2)).toBe(false)
    expect(r.get(3)?.fila?.texto).toBe('8 × 60')
    expect(r.get(4)?.fila?.texto).toBe('6 × 62,5')
    expect(r.has(5)).toBe(false)
  })
  it('sigue el orden de las series, no el de creación, y salta las no realizadas', () => {
    const previas = [s(11, { orden: 2, peso: 70 }), s(10, { orden: 1, peso: 65, realizada: false }), s(12, { orden: 3, peso: 75 })]
    const r = anterioresPorSerie([s(1), s(2)], previas)
    expect(r.get(1)?.fila?.texto).toBe('8 × 70')
    expect(r.get(2)?.fila?.texto).toBe('8 × 75')
  })
  it('lados y bajadas se comparan con su par', () => {
    const previa = s(10, { ejecucion: 'lados', lados: { izquierda: { reps: 10, peso: 14 }, derecha: { reps: 9, peso: 14 } }, bajadas: [{ id: 'a', reps: 6, peso: 10, lados: { izquierda: { reps: 6, peso: 10 } } }] })
    const r = anterioresPorSerie([s(1)], [previa]).get(1)!
    expect(r.fila).toBeUndefined()
    expect(r.lados.izquierda?.texto).toBe('10 × 14')
    expect(r.lados.derecha?.texto).toBe('9 × 14')
    expect(r.bajadas[0].lados.izquierda?.texto).toBe('6 × 10')
    expect(r.bajadas[0].lados.derecha).toBeUndefined()
    const drop = anterioresPorSerie([s(1)], [s(10, { bajadas: [{ id: 'a', reps: 5, peso: 40 }, { id: 'b', reps: 4, peso: 30 }] })]).get(1)!
    expect(drop.bajadas.map(b => b.fila?.texto)).toEqual(['5 × 40', '4 × 30'])
  })
})

describe('seriesSesionAnterior', () => {
  it('toma la última sesión terminada con el ejercicio que empezó antes que la actual', () => {
    const workouts = [{ id: 1, inicio: 100, fin: 200 }, { id: 2, inicio: 300, fin: 400 }, { id: 3, inicio: 500 }, { id: 4, inicio: 600, fin: 700 }, { id: 5, inicio: 350, fin: 360 }]
    const todas = [s(1, { workoutId: 1 }), s(2, { workoutId: 2 }), s(3, { workoutId: 2 }), s(4, { workoutId: 3 }), s(5, { workoutId: 4 }), s(6, { workoutId: 5, exerciseId: 7 })]
    // Activo (3): la anterior es la 2; la 5 es posterior pero no tiene el ejercicio; la 4 empezó después.
    expect(seriesSesionAnterior(todas, 1, { id: 3, inicio: 500 }, workouts).map(x => x.id)).toEqual([2, 3])
    // Editando la 2: la anterior es la 1.
    expect(seriesSesionAnterior(todas, 1, { id: 2, inicio: 300 }, workouts).map(x => x.id)).toEqual([1])
    expect(seriesSesionAnterior(todas, 9, { id: 3, inicio: 500 }, workouts)).toEqual([])
  })
  it('solo cuenta sesiones del mismo gimnasio', () => {
    const workouts = [{ id: 1, inicio: 100, fin: 200 }, { id: 2, inicio: 300, fin: 400 }, { id: 3, inicio: 500 }]
    const todas = [s(1, { workoutId: 1 }), s(2, { workoutId: 2, gimnasioId: 7 }), s(3, { workoutId: 3, gimnasioId: 7 })]
    expect(seriesSesionAnterior(todas, 1, { id: 3, inicio: 500 }, workouts, 7).map(x => x.id)).toEqual([2])
    expect(seriesSesionAnterior(todas, 1, { id: 3, inicio: 500 }, workouts).map(x => x.id)).toEqual([1])
    expect(seriesSesionAnterior(todas, 1, { id: 3, inicio: 500 }, workouts, 8)).toEqual([])
  })
})

describe('días desde la última sesión con el ejercicio (tras un parón)', () => {
  const dia = (d: number, h = 18) => new Date(2026, 9, d, h).getTime()
  const serie = (id: number, workoutId: number, exerciseId = 1, gimnasioId?: number) => ({ id, workoutId, exerciseId, reps: 8, peso: 50, orden: 0, createdAt: id, ...(gimnasioId ? { gimnasioId } : {}) }) as SetEntry
  const actual = { id: 9, inicio: dia(30) }

  it('cuenta días naturales hasta la última sesión terminada anterior; avisa con la pausa de «Vuelta al ruedo»', () => {
    const conUna = (d: number) => diasDesdeUltimaSesion([serie(1, 1)], 1, actual, [{ id: 1, inicio: dia(d), fin: dia(d, 19) }, actual])
    // 13 y 14 días sin hacerlo (14 y 15 de distancia): avisa desde 14 sin hacerlo, como el logro.
    expect(conUna(16)).toBe(14)
    expect(trasParon(conUna(16))).toBe(false)
    expect(conUna(15)).toBe(15)
    expect(trasParon(conUna(15))).toBe(true)
    expect(diasDesdeUltimaSesion([serie(1, 1)], 1, { id: 9, inicio: dia(20) }, [{ id: 1, inicio: new Date(2026, 8, 10, 18).getTime(), fin: 1 }])).toBe(40)
  })

  it('la más reciente, en cualquier gimnasio; sin historial o con el entreno anterior sin terminar, nada', () => {
    const workouts = [{ id: 1, inicio: dia(1), fin: dia(1, 19) }, { id: 2, inicio: dia(20), fin: dia(20, 19) }, { id: 3, inicio: dia(25) }, actual]
    expect(diasDesdeUltimaSesion([serie(1, 1), serie(2, 2, 1, 7)], 1, actual, workouts)).toBe(10)
    expect(diasDesdeUltimaSesion([serie(1, 3)], 1, actual, workouts)).toBeNull()
    expect(diasDesdeUltimaSesion([serie(1, 1, 2)], 1, actual, workouts)).toBeNull()
    expect(trasParon(null)).toBe(false)
    // Las del propio entreno y las posteriores no cuentan.
    expect(diasDesdeUltimaSesion([serie(1, 9)], 1, actual, workouts)).toBeNull()
  })
})
