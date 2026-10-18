import { describe, expect, it } from 'vitest'
import type { Exercise, SetEntry, Workout, WorkoutExerciseMuscles } from '../../../shared/db/types'
import { parseISODate } from '../../../shared/lib/dates'
import { aportesMusculares, calorMuscular, CALOR_MUSCULAR, fraseSubidas, nivelCalor, nivelesDeCalor, resumenCalor, subidasDeNivel } from './calorMuscular'

const BANCA: WorkoutExerciseMuscles = { exerciseId: 1, nombre: 'Press banca', primaryMuscles: ['pecho'], secondaryMuscles: ['triceps', 'hombros'] }
const CURL: WorkoutExerciseMuscles = { exerciseId: 2, nombre: 'Curl', primaryMuscles: ['biceps'], secondaryMuscles: ['antebrazo'] }
let siguiente = 1
function entreno(fecha: string, ejercicios: [WorkoutExerciseMuscles, number][], extra: Partial<Workout> = {}) {
  const id = siguiente++
  const inicio = parseISODate(fecha).getTime() + 18 * 3_600_000
  const workout: Workout = { id, inicio, fin: inicio + 3_600_000, muscleSnapshot: { version: 1, exercises: ejercicios.map(([e]) => e) }, ...extra }
  const sets: SetEntry[] = ejercicios.flatMap(([e, n]) => Array.from({ length: n }, (_, i) => ({ id: id * 100 + e.exerciseId * 10 + i, workoutId: id, exerciseId: e.exerciseId, orden: i, reps: 8, peso: 60, createdAt: inicio })))
  return { workout, sets }
}
function mapa(entrenos: ReturnType<typeof entreno>[], hoy: string, exercises: Exercise[] = []) {
  const { aportes, sinClasificar } = aportesMusculares(entrenos.map(e => e.workout), entrenos.flatMap(e => e.sets), exercises)
  return calorMuscular(aportes, hoy, sinClasificar)
}

describe('calor muscular acumulado', () => {
  it('sin entrenos: todo neutro, sin huella', () => {
    const c = mapa([], '2026-10-19')
    expect(c.conDatos).toBe(false)
    expect(Object.values(c.musculos).every(m => m.nivel === 0 && !m.huella && m.diasDesde === null)).toBe(true)
    expect(resumenCalor(c)).toEqual({ masCalor: [], pocoCalor: [] })
  })

  it('principal 1 y secundario 0,5 por serie efectiva; un músculo en las dos listas cuenta como principal', () => {
    const doble = { ...BANCA, secondaryMuscles: ['pecho', 'triceps'] }
    const c = mapa([entreno('2026-10-19', [[doble, 4]])], '2026-10-19')
    expect(c.musculos.pecho.series7).toBe(4)
    expect(c.musculos.triceps.series7).toBe(2)
    expect(c.musculos.pecho.directas28).toBe(4)
    expect(c.musculos.triceps.indirectas28).toBe(2)
  })

  it('el calor se reduce a la mitad cada 7 días y desaparece fuera de la ventana', () => {
    const e = [entreno('2026-10-01', [[BANCA, 4]])]
    const dia0 = mapa(e, '2026-10-01').musculos.pecho.calor
    expect(dia0).toBeCloseTo(4)
    expect(mapa(e, '2026-10-08').musculos.pecho.calor).toBeCloseTo(2)
    expect(mapa(e, '2026-10-15').musculos.pecho.calor).toBeCloseTo(1)
    expect(mapa(e, '2026-11-26').musculos.pecho.calor).toBe(0) // 56 días después
    expect(mapa(e, '2026-11-26').musculos.pecho.ritmo).toBe(0)
  })

  it('el ritmo es calor × ln 2 y los niveles empiezan en sus umbrales exactos', () => {
    expect(nivelCalor(0)).toBe(0)
    expect(nivelCalor(0.49)).toBe(0)
    CALOR_MUSCULAR.umbrales.forEach((u, i) => expect(nivelCalor(u)).toBe(i + 1))
    const c = mapa([entreno('2026-10-19', [[BANCA, 3]])], '2026-10-19')
    expect(c.musculos.pecho.ritmo).toBeCloseTo(3 * Math.LN2)
  })

  it('un entreno exagerado cuenta como 10 series por músculo y día: no pasa de Moderado', () => {
    const c = mapa([entreno('2026-10-19', [[BANCA, 30]])], '2026-10-19')
    expect(c.musculos.pecho.calor).toBeCloseTo(CALOR_MUSCULAR.topeDia)
    expect(c.musculos.pecho.nivel).toBe(3)
    expect(c.musculos.pecho.series7).toBe(30) // las cifras del detalle son las reales
  })

  it('la constancia sube el nivel y la pausa deja huella', () => {
    const semanas = [0, 1, 2, 3].flatMap(s => [entreno(`2026-09-${String(1 + s * 7).padStart(2, '0')}`, [[BANCA, 8]]), entreno(`2026-09-${String(4 + s * 7).padStart(2, '0')}`, [[BANCA, 8]])])
    expect(mapa(semanas, '2026-09-25').musculos.pecho.nivel).toBe(5)
    const despues = mapa(semanas, '2026-11-30').musculos.pecho
    expect(despues.nivel).toBe(0)
    expect(despues.huella).toBe(true)
    expect(mapa(semanas, '2026-11-30').musculos.gemelos.huella).toBe(false)
  })

  it('calentamientos, pendientes, series sin reps y entrenos sin terminar no cuentan; las antiguas sin marca sí', () => {
    const e = entreno('2026-10-19', [[BANCA, 4]])
    e.sets[0].tipo = 'calentamiento'
    e.sets[1].realizada = false
    e.sets[2].reps = 0
    const activo = entreno('2026-10-19', [[CURL, 3]], { fin: undefined })
    const c = mapa([e, activo], '2026-10-19')
    expect(c.musculos.pecho.series7).toBe(1)
    expect(c.musculos.biceps.series7).toBe(0)
  })

  it('sin snapshot usa la clasificación actual; sin músculo queda en la cobertura y no reparte', () => {
    const viejo = entreno('2026-10-18', [[{ ...CURL, primaryMuscles: [], secondaryMuscles: [] }, 2]], { muscleSnapshot: undefined })
    const ejercicios: Exercise[] = [{ id: 2, nombre: 'Curl mío', primaryMuscles: ['biceps'], secondaryMuscles: [] } as unknown as Exercise]
    expect(mapa([viejo], '2026-10-19', ejercicios).musculos.biceps.series7).toBe(2)
    const sinMusculo = entreno('2026-10-18', [[{ exerciseId: 3, nombre: 'Mi circuito', primaryMuscles: ['completo'], secondaryMuscles: [] }, 3]])
    const c = mapa([sinMusculo], '2026-10-19')
    expect(c.conDatos).toBe(false)
    expect(c.sinClasificar28).toEqual({ series: 3, nombres: ['Mi circuito'] })
  })

  it('el detalle da última vez, semanas con trabajo y los ejercicios que más aportan', () => {
    const c = mapa([entreno('2026-10-01', [[BANCA, 2]]), entreno('2026-10-16', [[BANCA, 4], [CURL, 3]])], '2026-10-19')
    const pecho = c.musculos.pecho
    expect(pecho.diasDesde).toBe(3)
    expect(pecho.series28).toBe(6)
    expect(pecho.semanas28).toBe(2)
    expect(pecho.ejercicios).toEqual([{ exerciseId: 1, nombre: 'Press banca', rol: 'principal', series: 6 }])
    expect(c.musculos.antebrazo.ejercicios[0]).toMatchObject({ nombre: 'Curl', rol: 'secundario', series: 1.5 })
  })

  it('ignora los entrenos posteriores al día consultado', () => {
    const c = mapa([entreno('2026-10-20', [[BANCA, 4]])], '2026-10-19')
    expect(c.musculos.pecho.calor).toBe(0)
    expect(c.conDatos).toBe(false)
  })

  it('resumen y subidas de nivel para el antes → después', () => {
    const previo = entreno('2026-10-15', [[BANCA, 6]])
    const hoy = entreno('2026-10-19', [[BANCA, 6], [CURL, 4]])
    const antes = mapa([previo], '2026-10-19'), despues = mapa([previo, hoy], '2026-10-19')
    expect(subidasDeNivel(antes, despues)).toEqual(expect.arrayContaining(['pecho', 'biceps']))
    expect(subidasDeNivel(despues, despues)).toEqual([])
    expect(resumenCalor(despues).masCalor[0]).toBe('pecho')
    expect(resumenCalor(despues).pocoCalor).toHaveLength(2)
  })

  it('frase del antes → después y niveles para las figuras', () => {
    const vacio = mapa([], '2026-10-19')
    const uno = mapa([entreno('2026-10-19', [[BANCA, 4]])], '2026-10-19')
    expect(fraseSubidas(vacio, uno)).toBe('Sube Pecho a bajo, Hombros a muy bajo y Tríceps a muy bajo.')
    expect(fraseSubidas(uno, uno)).toBe('Ningún grupo cambia de nivel: tu mapa mantiene su calor.')
    const cinco = mapa([entreno('2026-10-19', [[BANCA, 4], [CURL, 4], [{ exerciseId: 5, nombre: 'Sentadilla', primaryMuscles: ['cuadriceps'], secondaryMuscles: ['gluteos'] }, 4]])], '2026-10-19')
    expect(fraseSubidas(vacio, cinco)).toMatch(/ y 4 más\.$/)
    expect(nivelesDeCalor(uno).levels.pecho).toBe(2)
    expect(nivelesDeCalor(uno).huella.pecho).toBe(false)
  })
})
