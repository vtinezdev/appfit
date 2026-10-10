import { describe, expect, it } from 'vitest'
import type { Exercise, SetEntry, Workout } from '../../../shared/db/types'
import { addDays, parseISODate } from '../../../shared/lib/dates'
import { calcularAtributos } from '../../atributos/lib/atributos'
import { ZONAS_MUSCULARES } from '../../gym/lib/musculos'
import { calcularAtlas } from './atlas'
import { calcularLogros, conseguido, logrosDeEntreno, nivelDe, recuentoPiezas, siguienteUmbral } from './logros'
import { describirMarca, muroRecords } from './muro'

let id = 1
/** Ejercicio propio que trabaja una zona como principal (nombre inventado: no casa con el catálogo). */
const ejercicio = (zona: string): Exercise => ({ id: id++, nombre: `Zzz ${zona}`, nombreNorm: `zzz ${zona}`, grupo: zona, primaryMuscles: [zona] })

function entreno(fecha: string, series: { exerciseId: number; peso: number; reps?: number; modoCarga?: SetEntry['modoCarga'] }[], hora = 18) {
  const inicio = parseISODate(fecha).getTime() + hora * 3_600_000
  const workout: Workout = { id: id++, inicio, fin: inicio + 3_600_000 }
  const sets: SetEntry[] = series.map((s, i) => ({ id: id++, workoutId: workout.id, exerciseId: s.exerciseId, orden: i, reps: s.reps ?? 8, peso: s.peso, createdAt: inicio + i, ...(s.modoCarga ? { modoCarga: s.modoCarga } : {}) }))
  return { workout, sets }
}
const seis = (exerciseId: number, peso: number) => Array.from({ length: 6 }, () => ({ exerciseId, peso }))
const porWorkout = (es: ReturnType<typeof entreno>[]) => new Map(es.map((e) => [e.workout.id, e.sets]))

describe('atlas', () => {
  it('semana completa con los 12 grupos y ejercicios dominados con 3 sesiones', () => {
    const ejercicios = ZONAS_MUSCULARES.map(ejercicio)
    const mitad = ejercicios.slice(0, 6).map((e) => ({ exerciseId: e.id, peso: 20 }))
    const resto = ejercicios.slice(6).map((e) => ({ exerciseId: e.id, peso: 20 }))
    const es = [entreno('2026-10-05', mitad), entreno('2026-10-07', resto), entreno('2026-10-12', mitad), entreno('2026-10-14', mitad)]
    const atlas = calcularAtlas(es.map((e) => e.workout), porWorkout(es), ejercicios)
    expect(atlas.semanas[0].completa).toEqual({ workoutId: es[1].workout.id, fecha: '2026-10-07' })
    expect(atlas.semanas[1]).toMatchObject({ completa: null })
    expect(atlas.desdeSiempre.size).toBe(12)
    expect(atlas.dominados.map((d) => d.sesiones)).toEqual([3, 3, 3, 3, 3, 3])
  })
})

describe('muro de récords', () => {
  it('mejor marca vigente con el día en que se logró por primera vez', () => {
    const banca = ejercicio('pecho').id
    const fondos = ejercicio('triceps').id
    const es = [
      entreno('2026-10-01', [{ exerciseId: banca, peso: 80, reps: 5 }, { exerciseId: fondos, peso: 0, reps: 10, modoCarga: 'corporal' }]),
      entreno('2026-10-05', [{ exerciseId: banca, peso: 80, reps: 8 }, { exerciseId: fondos, peso: 0, reps: 14, modoCarga: 'corporal' }]),
    ]
    const muro = muroRecords(es.map((e) => e.workout), es.flatMap((e) => e.sets))
    const b = muro.find((m) => m.exerciseId === banca)!
    expect(b.marcas).toEqual([{ tipo: 'peso', valor: 80, fecha: '2026-10-01' }, { tipo: '1rm', valor: 101.3, fecha: '2026-10-05' }])
    expect(muro.find((m) => m.exerciseId === fondos)!.marcas).toEqual([{ tipo: 'reps', valor: 14, fecha: '2026-10-05' }])
    expect(describirMarca(b.marcas[0], b.modo)).toMatchObject({ nombre: 'Peso máximo', valor: '80 kg' })
  })
})

describe('logros', () => {
  const banca = ejercicio('pecho').id
  /** 10 entrenos (lunes, miércoles y viernes desde el 7 de septiembre), con el peso subiendo. */
  const es = Array.from({ length: 10 }, (_, i) => entreno(addDays('2026-09-07', Math.floor(i / 3) * 7 + (i % 3) * 2), seis(banca, 40 + i), i === 9 ? 7 : 18))
  const atributos = calcularAtributos({ hoy: '2026-10-10', workouts: es.map((e) => e.workout), sets: es.flatMap((e) => e.sets), entries: [], protObjetivo: new Map(), conNutricion: false })
  const logros = calcularLogros({ hoy: '2026-10-10', atributos, atlas: calcularAtlas([], new Map(), []), herbario: [], conNutricion: false })
  const de = (idLogro: string) => logros.find((l) => l.id === idLogro)!

  it('niveles con su fecha real y el progreso hacia el siguiente', () => {
    const entrenos = de('entrenos')
    expect(nivelDe(entrenos)).toBe(1)
    expect(entrenos.niveles[0]).toEqual({ fecha: '2026-09-28', workoutId: es[9].workout.id })
    expect(siguienteUmbral(entrenos)).toBe(50)
    expect(entrenos.descripcion).toBe('50 entrenos de 6 series efectivas o más')
  })

  it('sin nutrición, sus logros no aparecen; los ocultos se cuentan como piezas', () => {
    expect(logros.some((l) => l.grupo === 'nutricion')).toBe(false)
    expect(conseguido(de('madrugador'))).toBe(false)
    expect(de('madrugador').progreso).toBe(1)
    // Entrenos I, Hilo I (4 semanas seguidas) y Descanso bien llevado (repetible: una pieza).
    expect(recuentoPiezas(logros)).toEqual({ conseguidas: 3, total: 4 + 3 + 1 + 4 + 4 + 3 })
  })

  it('semanas cumplidas y logros del entreno con el que se consiguieron', () => {
    expect(de('semanas').progreso).toBe(3) // tres semanas con tres entrenos (sin nutrición)
    expect(logrosDeEntreno(logros, es[9].workout.id).map((n) => [n.logro.id, n.nivel])).toEqual([['entrenos', 1]])
  })

  it('vuelta al ruedo tras 14 días o más sin entrenar', () => {
    const dos = [entreno('2026-09-01', seis(banca, 40)), entreno('2026-09-20', seis(banca, 40))]
    const a = calcularAtributos({ hoy: '2026-10-10', workouts: dos.map((e) => e.workout), sets: dos.flatMap((e) => e.sets), entries: [], protObjetivo: new Map(), conNutricion: false })
    const l = calcularLogros({ hoy: '2026-10-10', atributos: a, atlas: calcularAtlas([], new Map(), []), herbario: [], conNutricion: false })
    expect(l.find((x) => x.id === 'vuelta')!.veces).toEqual([{ fecha: '2026-09-20', workoutId: dos[1].workout.id }])
  })
})
