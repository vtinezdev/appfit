import { describe, expect, it } from 'vitest'
import type { Exercise, Pausa, SetEntry, Workout, WorkoutExerciseMuscles } from '../../../shared/db/types'
import { addDays, parseISODate } from '../../../shared/lib/dates'
import {
  aportesMusculares, fraseSubidas, MAXIMO_PROGRESO, musculosDelEntreno, nivelesDeProgreso, nivelProgreso, nombreNivel, progresoMuscular,
  PROGRESO_MUSCULAR, resumenProgreso, SEMANAS_TENDENCIA, subidasDeNivel, textoEstado, textoSemana,
} from './progresoMuscular'

const BANCA: WorkoutExerciseMuscles = { exerciseId: 1, nombre: 'Press banca', primaryMuscles: ['pecho'], secondaryMuscles: ['triceps', 'hombros'] }
const CURL: WorkoutExerciseMuscles = { exerciseId: 2, nombre: 'Curl', primaryMuscles: ['biceps'], secondaryMuscles: ['antebrazo'] }
/** Lunes. */
const L0 = '2025-01-06'
let siguiente = 1
function entreno(fecha: string, ejercicios: [WorkoutExerciseMuscles, number][], extra: Partial<Workout> = {}) {
  const id = siguiente++
  const inicio = parseISODate(fecha).getTime() + 18 * 3_600_000
  const workout: Workout = { id, inicio, fin: inicio + 3_600_000, muscleSnapshot: { version: 1, exercises: ejercicios.map(([e]) => e) }, ...extra }
  const sets: SetEntry[] = ejercicios.flatMap(([e, n]) => Array.from({ length: n }, (_, i) => ({ id: id * 1000 + e.exerciseId * 100 + i, workoutId: id, exerciseId: e.exerciseId, orden: i, reps: 8, peso: 60, createdAt: inicio })))
  return { workout, sets }
}
/** Un entreno cada miércoles durante `n` semanas desde el lunes `desde`. */
function semanas(desde: string, n: number, ejercicios: [WorkoutExerciseMuscles, number][]) {
  return Array.from({ length: n }, (_, i) => entreno(addDays(desde, i * 7 + 2), ejercicios))
}
function mapa(entrenos: ReturnType<typeof entreno>[], hoy: string, opciones: { exercises?: Exercise[]; pausas?: Pausa[] } = {}) {
  const { aportes, sinClasificar } = aportesMusculares(entrenos.map(e => e.workout), entrenos.flatMap(e => e.sets), opciones.exercises ?? [])
  return progresoMuscular(aportes, hoy, sinClasificar, opciones.pausas)
}
/** El domingo de la semana `i` (0 = la de L0): esa semana aún está en curso. */
const domingo = (i: number) => addDays(L0, i * 7 + 6)
/** El lunes siguiente a la semana `i`: la semana `i` ya está cerrada. */
const cerrada = (i: number) => addDays(L0, (i + 1) * 7)

describe('escalera', () => {
  it('niveles desde sus umbrales exactos y con nombre de tramo', () => {
    expect(nivelProgreso(0)).toBe(0)
    expect(nivelProgreso(0.99)).toBe(0)
    PROGRESO_MUSCULAR.umbrales.forEach((u, i) => expect(nivelProgreso(u)).toBe(i + 1))
    expect(MAXIMO_PROGRESO).toBe(48)
    expect([0, 1, 3, 4, 6, 7, 9].map(n => nombreNivel(n as never))).toEqual(['Sin nivel', 'Básico I', 'Básico III', 'Intermedio I', 'Intermedio III', 'Avanzado I', 'Avanzado III'])
  })
})

describe('progreso muscular', () => {
  it('sin entrenos: todo neutro, sin huella ni resumen', () => {
    const p = mapa([], L0)
    expect(p.conDatos).toBe(false)
    expect(Object.values(p.musculos).every(m => m.nivel === 0 && !m.huella && m.estado === 'sin-empezar' && m.siguiente === 1)).toBe(true)
    expect(resumenProgreso(p)).toEqual({ masAvanzados: [], porDesarrollar: [] })
  })

  it('principal 1 y secundario 0,5 por serie efectiva; un músculo en las dos listas cuenta como principal', () => {
    const doble = { ...BANCA, secondaryMuscles: ['pecho', 'triceps'] }
    const p = mapa([entreno(L0, [[doble, 4]])], L0)
    expect(p.musculos.pecho.series7).toBe(4)
    expect(p.musculos.triceps.series7).toBe(2)
    expect(p.musculos.pecho.directas28).toBe(4)
    expect(p.musculos.triceps.indirectas28).toBe(2)
  })

  it('una semana con la dosis es una semana completa; con menos cuenta la parte y más no adelanta', () => {
    expect(mapa([entreno(L0, [[BANCA, 10]])], domingo(0)).musculos.pecho.semanas).toBe(1)
    expect(mapa([entreno(L0, [[BANCA, 5]])], domingo(0)).musculos.pecho.semanas).toBe(0.5)
    const exagerada = mapa([entreno(L0, [[BANCA, 30]])], domingo(0)).musculos.pecho
    expect(exagerada.semanas).toBe(1)
    expect(exagerada.series7).toBe(30) // las cifras del detalle son las reales
    expect(exagerada.semanaActual).toEqual({ series: 30, dosis: 10 })
    // Los grupos pequeños se completan con 6.
    expect(mapa([entreno(L0, [[CURL, 6]])], domingo(0)).musculos.biceps.semanas).toBe(1)
  })

  it('lo indirecto completa como mucho media semana', () => {
    const p = mapa([entreno(L0, [[BANCA, 20]])], domingo(0))
    expect(p.musculos.triceps.indirectas28).toBe(10)
    expect(p.musculos.triceps.semanas).toBe(0.5)
    expect(p.musculos.triceps.semanaActual).toEqual({ series: 3, dosis: 6 })
  })

  it('un año de semanas completas llega al máximo, y no antes', () => {
    const anio = semanas(L0, 48, [[BANCA, 10]])
    expect(mapa(anio, domingo(46)).musculos.pecho.nivel).toBe(8)
    const fin = mapa(anio, domingo(47)).musculos.pecho
    expect(fin.semanas).toBe(MAXIMO_PROGRESO)
    expect(fin).toMatchObject({ nivel: 9, siguiente: null, estado: 'avanzando' })
    expect(mapa(semanas(L0, 60, [[BANCA, 10]]), domingo(59)).musculos.pecho.semanas).toBe(MAXIMO_PROGRESO)
  })

  it('baja poco a poco: dos semanas de gracia y después una semana menos por cada una sin trabajo', () => {
    const diez = semanas(L0, 10, [[BANCA, 10]])
    const en = (i: number) => mapa(diez, cerrada(i)).musculos.pecho
    expect(en(9).semanas).toBe(10)
    expect(en(11)).toMatchObject({ semanas: 10, estado: 'en-gracia', semanasSin: 2 })
    expect(en(12)).toMatchObject({ semanas: 9, estado: 'bajando', semanasSin: 3 })
    expect(en(14).semanas).toBe(7)
    expect(en(30).semanas).toBe(0)
  })

  it('una semana por debajo del 30 % de la dosis cuenta como semana sin trabajo', () => {
    const p = mapa([...semanas(L0, 10, [[BANCA, 10]]), ...semanas(addDays(L0, 70), 3, [[BANCA, 2]])], cerrada(12)).musculos.pecho
    expect(p.estado).toBe('bajando')
    expect(p.semanas).toBeCloseTo(10 + 0.2 + 0.2 - 1)
  })

  it('la semana en curso no resta aunque aún no se haya entrenado', () => {
    const diez = semanas(L0, 10, [[BANCA, 10]])
    // Lunes de la semana 12: las semanas 10 y 11 cerraron sin trabajo (gracia) y la 12 empieza.
    expect(mapa(diez, cerrada(11)).musculos.pecho).toMatchObject({ semanas: 10, estado: 'en-gracia' })
  })

  it('las semanas en pausa de Ritmo no restan', () => {
    const diez = semanas(L0, 10, [[BANCA, 10]])
    const pausas: Pausa[] = [{ id: 'p', desde: addDays(L0, 70), tipo: 'entreno', motivo: 'lesion' }]
    const p = mapa(diez, domingo(20), { pausas }).musculos.pecho
    expect(p).toMatchObject({ semanas: 10, estado: 'en-pausa', semanasSin: 0 })
  })

  it('memoria muscular: por debajo del máximo alcanzado cada semana cuenta doble', () => {
    const antes = semanas(L0, 10, [[BANCA, 10]])
    // 6 semanas sin trabajo (2 de gracia + 4 de bajada): de 10 a 6.
    const vuelta = semanas(addDays(L0, 16 * 7), 3, [[BANCA, 10]])
    expect(mapa(antes, cerrada(15)).musculos.pecho).toMatchObject({ semanas: 6, memoria: true })
    expect(mapa([...antes, ...vuelta], domingo(16)).musculos.pecho.semanas).toBe(8)
    const recuperado = mapa([...antes, ...vuelta], domingo(18)).musculos.pecho
    expect(recuperado.semanas).toBe(11)
    expect(recuperado.memoria).toBe(false)
  })

  it('quien lo perdió todo deja huella; quien nunca entrenó, no', () => {
    const p = mapa(semanas(L0, 4, [[BANCA, 10]]), domingo(20))
    expect(p.musculos.pecho).toMatchObject({ nivel: 0, nivelMaximo: 2, huella: true })
    expect(p.musculos.gemelos.huella).toBe(false)
    expect(nivelesDeProgreso(p).huella.pecho).toBe(true)
  })

  it('calentamientos, pendientes, series sin reps y entrenos sin terminar no cuentan; las antiguas sin marca sí', () => {
    const e = entreno(L0, [[BANCA, 4]])
    e.sets[0].tipo = 'calentamiento'
    e.sets[1].realizada = false
    e.sets[2].reps = 0
    const activo = entreno(L0, [[CURL, 3]], { fin: undefined })
    const p = mapa([e, activo], L0)
    expect(p.musculos.pecho.series7).toBe(1)
    expect(p.musculos.biceps.series7).toBe(0)
  })

  it('sin snapshot usa la clasificación actual; sin músculo queda en la cobertura y no reparte', () => {
    const viejo = entreno(L0, [[{ ...CURL, primaryMuscles: [], secondaryMuscles: [] }, 2]], { muscleSnapshot: undefined })
    const exercises: Exercise[] = [{ id: 2, nombre: 'Curl mío', primaryMuscles: ['biceps'], secondaryMuscles: [] } as unknown as Exercise]
    expect(mapa([viejo], addDays(L0, 1), { exercises }).musculos.biceps.series7).toBe(2)
    const sinMusculo = entreno(L0, [[{ exerciseId: 3, nombre: 'Mi circuito', primaryMuscles: ['completo'], secondaryMuscles: [] }, 3]])
    const p = mapa([sinMusculo], addDays(L0, 1))
    expect(p.conDatos).toBe(false)
    expect(p.sinClasificar28).toEqual({ series: 3, nombres: ['Mi circuito'] })
  })

  it('el detalle da última vez, series de 7 y 28 días y los ejercicios que más aportan', () => {
    const p = mapa([entreno('2025-01-01', [[BANCA, 2]]), entreno('2025-01-16', [[BANCA, 4], [CURL, 3]])], '2025-01-19')
    const pecho = p.musculos.pecho
    expect(pecho.diasDesde).toBe(3)
    expect(pecho.series7).toBe(4)
    expect(pecho.series28).toBe(6)
    expect(pecho.ejercicios).toEqual([{ exerciseId: 1, nombre: 'Press banca', rol: 'principal', series: 6 }])
    expect(p.musculos.antebrazo.ejercicios[0]).toMatchObject({ nombre: 'Curl', rol: 'secundario', series: 1.5 })
  })

  it('ignora los entrenos posteriores al día consultado', () => {
    const p = mapa([entreno(addDays(L0, 1), [[BANCA, 4]])], L0)
    expect(p.musculos.pecho.semanas).toBe(0)
    expect(p.conDatos).toBe(false)
  })

  it('resumen: los más avanzados y los que más pueden crecer', () => {
    const aperturas: WorkoutExerciseMuscles = { exerciseId: 7, nombre: 'Aperturas', primaryMuscles: ['pecho'], secondaryMuscles: [] }
    const p = mapa([...semanas(L0, 4, [[aperturas, 10]]), entreno(addDays(L0, 23), [[CURL, 6]])], domingo(3))
    const r = resumenProgreso(p)
    expect(r.masAvanzados).toEqual(['pecho', 'biceps'])
    expect(r.porDesarrollar).toHaveLength(2)
    expect(r.porDesarrollar).not.toContain('pecho')
  })

  it('subidas de nivel y frase del final del entreno', () => {
    const previo = semanas(L0, 2, [[BANCA, 10]])
    const hoy = entreno(addDays(L0, 16), [[BANCA, 10], [CURL, 6]])
    const antes = mapa(previo, domingo(2)), despues = mapa([...previo, hoy], domingo(2))
    expect(subidasDeNivel(antes, despues)).toEqual(['pecho', 'biceps'])
    expect(fraseSubidas(antes, despues)).toBe('Pecho sube a Básico II y Bíceps a Básico I.')
    expect(subidasDeNivel(despues, despues)).toEqual([])
    expect(fraseSubidas(despues, despues)).toBe('Ningún grupo cambia de nivel hoy: cada semana completa te acerca al siguiente.')
    const vacio = mapa([], L0)
    const muchos = mapa([entreno(L0, [[BANCA, 10], [CURL, 6], [{ exerciseId: 5, nombre: 'Sentadilla', primaryMuscles: ['cuadriceps', 'gluteos'], secondaryMuscles: [] }, 10]])], domingo(0))
    expect(fraseSubidas(vacio, muchos)).toMatch(/ y 1 más\.$/)
  })

  it('últimas 8 semanas por músculo: las series que cuentan, la en curso al final y las semanas vacías a 0', () => {
    // 12 semanas: 10 series de banca (pecho directas; tríceps y hombros indirectas a 0,5) salvo un hueco en la semana 9.
    const entrenos = [...semanas(L0, 9, [[BANCA, 10]]), ...semanas(addDays(L0, 70), 2, [[BANCA, 4]])]
    const p = mapa(entrenos, addDays(L0, 11 * 7 + 1))
    const pecho = p.musculos.pecho.ultimasSemanas
    expect(pecho).toHaveLength(SEMANAS_TENDENCIA)
    expect(pecho.map(s => s.lunes)).toEqual(Array.from({ length: 8 }, (_, i) => addDays(L0, (4 + i) * 7)))
    expect(pecho.map(s => s.series)).toEqual([10, 10, 10, 10, 10, 0, 4, 0])
    // Lo indirecto cuenta con su tope (la mitad de la dosis), igual que «Esta semana».
    expect(p.musculos.triceps.ultimasSemanas[0].series).toBe(Math.min(5, 6 * PROGRESO_MUSCULAR.topeIndirecto))
    expect(p.musculos.pecho.ultimasSemanas.at(-1)!.series).toBe(p.musculos.pecho.semanaActual.series)
    // Sin series nunca: 8 semanas a 0.
    expect(p.musculos.gemelos.ultimasSemanas.every(s => s.series === 0 && !s.pausa)).toBe(true)
  })

  it('las semanas en pausa de Ritmo se marcan', () => {
    const pausas: Pausa[] = [{ id: 'p', desde: addDays(L0, 70), tipo: 'entreno', motivo: 'lesion' }]
    const p = mapa(semanas(L0, 10, [[BANCA, 10]]), addDays(L0, 11 * 7 + 1), { pausas })
    expect(p.musculos.pecho.ultimasSemanas.map(s => s.pausa)).toEqual([false, false, false, false, false, false, true, true])
  })

  it('músculos de un entreno, de más a menos series', () => {
    const e = entreno(L0, [[BANCA, 4], [CURL, 6]])
    const { aportes } = aportesMusculares([e.workout], e.sets, [])
    expect(musculosDelEntreno(aportes, e.workout.id)).toEqual(['biceps', 'pecho', 'antebrazo', 'hombros', 'triceps'])
  })
})

describe('textos del progreso', () => {
  it('estado según dónde está el grupo', () => {
    const diez = semanas(L0, 10, [[BANCA, 10]])
    const en = (hoy: string, pausas?: Pausa[]) => textoEstado(mapa(diez, hoy, { pausas }).musculos.pecho)
    expect(textoEstado(mapa([], L0).musculos.biceps)).toBe('Una semana con 6 series de este grupo lo lleva a Básico I.')
    expect(en(domingo(9))).toBe('Cada semana con 10 series suma una semana completa; con menos, la parte que hagas.')
    expect(en(cerrada(10))).toBe('Lleva 1 semana sin trabajarlo; empieza a bajar a la 3.ª seguida.')
    expect(en(cerrada(11))).toBe('Lleva 2 semanas sin trabajarlo: si esta semana tampoco llega al 30 %, empieza a bajar.')
    expect(en(cerrada(13))).toBe('Lleva 4 semanas sin trabajarlo: pierde una semana completa por cada semana más sin trabajo.')
    expect(en(domingo(12), [{ id: 'p', desde: addDays(L0, 70), tipo: 'total', motivo: 'viaje' }])).toBe('Estás en una pausa de Ritmo: mientras dure, no baja.')
    const vuelta = mapa([...diez, ...semanas(addDays(L0, 16 * 7), 1, [[BANCA, 10]])], domingo(16)).musculos.pecho
    expect(textoEstado(vuelta)).toBe('Recuperando: cada semana cuenta doble hasta volver a donde llegaste (Intermedio I).')
    expect(textoEstado(mapa(semanas(L0, 48, [[BANCA, 10]]), domingo(47)).musculos.pecho)).toBe('Nivel máximo. Para mantenerlo, sigue trabajándolo cada semana.')
  })

  it('lo que lleva la semana', () => {
    expect(textoSemana(mapa([entreno(L0, [[BANCA, 7]])], L0).musculos.pecho)).toBe('7 de 10 series')
    expect(textoSemana(mapa([entreno(L0, [[BANCA, 7]])], L0).musculos.triceps)).toBe('3 de 6 series')
    expect(textoSemana(mapa([entreno(L0, [[BANCA, 12]])], L0).musculos.pecho)).toBe('Semana completa')
  })
})
