import { describe, expect, it } from 'vitest'
import type { Exercise, SetEntry, WorkoutExerciseMuscles } from '../../../shared/db/types'
import { agregarCargaMuscular, calcularCargaEjercicio, crearSnapshotMuscular, normalizarCargaMuscular, trabajoMuscularWorkout } from './cargaMuscular'
import { CATALOGO_EJERCICIOS } from './catalogoEjercicios'
import { ZONAS_MUSCULARES } from './musculos'

const set = (exerciseId: number, reps = 8, peso = 50): SetEntry => ({ id: exerciseId, exerciseId, reps, peso, workoutId: 1, orden: 0, createdAt: 1 })
const banco: WorkoutExerciseMuscles = { exerciseId: 1, nombre: 'Press banca', primaryMuscles: ['pecho'], secondaryMuscles: ['triceps', 'hombros'] }
const local: Exercise = { id: 1, nombre: 'Press banca', nombreNorm: 'press banca', grupo: 'General' }

describe('carga por ejercicio: repeticiones y peso relativo, no intensidad fisiológica', () => {
  it('cada serie de 8 reps a su peso máximo aporta una unidad', () => {
    expect(calcularCargaEjercicio([set(1), set(1)])).toEqual({ stimulus: 2, sets: 2, reps: 16, externalVolume: 800 })
  })
  it('varía reps/peso sin comparar kilos entre ejercicios ni inventar masa corporal', () => {
    expect(calcularCargaEjercicio([set(1, 8, 0)]).stimulus).toBe(1)
    expect(calcularCargaEjercicio([set(1, 8, 100)]).stimulus).toBe(calcularCargaEjercicio([set(1, 8, 10)]).stimulus)
    expect(calcularCargaEjercicio([set(1, 16)]).stimulus).toBe(2)
    expect(calcularCargaEjercicio([set(1, 8, 100), set(1, 8, 50)]).stimulus).toBe(1.875)
  })
  it('vacío y series sin repeticiones no aportan', () => {
    expect(calcularCargaEjercicio([])).toEqual({ stimulus: 0, sets: 0, reps: 0, externalVolume: 0 })
    expect(calcularCargaEjercicio([set(1, 0), set(1, -8), set(1, NaN), set(1, Infinity)]).sets).toBe(0)
  })
  it('limita efecto de reps extremas; tonelaje queda separado y finito', () => {
    const large = calcularCargaEjercicio([set(1, Number.MAX_VALUE, Number.MAX_VALUE), set(1, Number.MAX_VALUE, Number.MAX_VALUE)])
    expect(large.stimulus).toBe(7.5)
    expect(Number.isFinite(large.externalVolume)).toBe(true)
    expect(Number.isFinite(large.reps)).toBe(true)
    expect(calcularCargaEjercicio([set(1, 8, -30), set(1, 8, Infinity)]).stimulus).toBe(2)
  })
})

describe('participación y agregación muscular', () => {
  it('principal 1.0, secundarios 0.5 sin duplicar grupos repetidos', () => {
    const work = agregarCargaMuscular([set(1)], [{ ...banco, primaryMuscles: ['pecho', 'pecho'], secondaryMuscles: ['pecho', 'triceps', 'triceps', 'hombros'] }])
    expect(work.muscles.pecho.score).toBe(1)
    expect(work.muscles.triceps.score).toBe(0.5)
    expect(work.muscles.hombros.score).toBe(0.5)
    expect(work.muscles.pecho.exercises).toHaveLength(1)
    expect(work.muscles.triceps.exercises[0].role).toBe('secondary')
  })
  it('suma varias series y varios ejercicios, no el número de ejercicios', () => {
    const segundo = { ...banco, exerciseId: 2, nombre: 'Aperturas', secondaryMuscles: [] }
    const work = agregarCargaMuscular([set(1), set(1), set(2, 16)], [banco, segundo])
    expect(work.muscles.pecho.score).toBe(4)
    expect(work.muscles.triceps.score).toBe(1)
    expect(work.muscles.pecho.exercises.map(e => e.sets)).toEqual([2, 1])
  })
  it('personalizado participa por su clasificación, sin depender de nombre ni catálogo', () => {
    const personalizado: Exercise = { id: 99, nombre: 'Mi remo', nombreNorm: 'mi remo', grupo: 'Espalda', primaryMuscles: ['espalda'], secondaryMuscles: ['biceps'], equipment: ['bandas'] }
    const snapshot = crearSnapshotMuscular([set(99, 10, 0)], [personalizado])
    const work = agregarCargaMuscular([set(99, 10, 0)], snapshot.exercises)
    expect(work.muscles.espalda.score).toBe(1.25)
    expect(work.muscles.biceps.score).toBe(0.625)
  })
  it('desconocidos y completo sin reparto específico quedan neutrales y con cobertura honesta', () => {
    const work = agregarCargaMuscular([set(1), set(2), set(3)], [banco, { ...banco, exerciseId: 2, nombre: 'Mi circuito', primaryMuscles: ['completo'], secondaryMuscles: [] }])
    expect(work.coverage).toEqual({ classified: 1, total: 3, unclassifiedSets: 2 })
    expect(work.unclassified).toEqual(['Mi circuito', 'Ejercicio no disponible'])
    expect(work.muscles.espalda.score).toBe(0)
  })
  it('vacío o sin reps conserva todos los grupos con score cero', () => {
    const work = agregarCargaMuscular([set(1, 0)], [banco])
    expect(work.coverage.total).toBe(0)
    expect(Object.values(work.muscles).every(m => m.score === 0 && !m.exercises.length)).toBe(true)
  })
})

describe('normalización independiente', () => {
  it('cero, negativo o no finito no se convierten en estímulo', () => {
    expect(Object.values(normalizarCargaMuscular({ pecho: 0, hombros: -1, espalda: Infinity, core: NaN })).every(n => n === 0)).toBe(true)
  })
  it('asigna 1–5 según proporción del grupo máximo, incluyendo límites', () => {
    expect(normalizarCargaMuscular({ pecho: 100, espalda: 80, core: 50, hombros: 25, triceps: 10 })).toMatchObject({ pecho: 5, espalda: 4, core: 3, hombros: 2, triceps: 1, biceps: 0 })
  })
  it('repetir toda la sesión no satura el mapa ni altera el reparto relativo', () => {
    const base = agregarCargaMuscular([set(1), set(2, 16)], [banco, { ...banco, exerciseId: 2, primaryMuscles: ['espalda'], secondaryMuscles: ['biceps'] }])
    const scores = Object.fromEntries(ZONAS_MUSCULARES.map(m => [m, base.muscles[m].score]))
    expect(normalizarCargaMuscular(scores)).toEqual(normalizarCargaMuscular(Object.fromEntries(Object.entries(scores).map(([m, v]) => [m, v * 100]))))
  })
  it('es robusta con extremos finitos', () => {
    expect(normalizarCargaMuscular({ pecho: Number.MAX_VALUE, espalda: Number.MAX_VALUE / 2, core: Number.MIN_VALUE })).toMatchObject({ pecho: 5, espalda: 3, core: 1 })
  })
})

describe('snapshot semántico y sesiones antiguas', () => {
  it('clasifica antiguo solo por nombre/alias exacto sin mutarlo', () => {
    const original = structuredClone(local)
    expect(crearSnapshotMuscular([set(1)], [local]).exercises[0]).toMatchObject({ catalogId: 'appfit:press-banca', primaryMuscles: ['pecho'] })
    expect(local).toEqual(original)
    expect(crearSnapshotMuscular([set(1)], [{ ...local, nombreNorm: 'press banca mio' }]).exercises[0].primaryMuscles).toEqual([])
  })
  it('oficial usa músculos concretos vigentes, aunque metadatos locales anteriores digan completo', () => {
    expect(crearSnapshotMuscular([set(1)], [{ ...local, catalogId: 'appfit:peso-muerto', primaryMuscles: ['completo'] }]).exercises[0].primaryMuscles).toEqual(['gluteos', 'isquiotibiales'])
  })
  it('snapshot domina futuras clasificaciones y conserva nombres', () => {
    const snapshot = crearSnapshotMuscular([set(1)], [local])
    const changed = { ...local, nombre: 'Renombrado', primaryMuscles: ['core'], secondaryMuscles: [], equipment: ['corporal'] }
    expect(trabajoMuscularWorkout({ muscleSnapshot: snapshot }, [set(1)], [changed]).muscles.pecho.score).toBe(1)
    expect(trabajoMuscularWorkout({ muscleSnapshot: snapshot }, [set(1)], [changed]).muscles.core.score).toBe(0)
    expect(trabajoMuscularWorkout({ muscleSnapshot: snapshot }, [set(1)], []).muscles.pecho.exercises[0].nombre).toBe('Press banca')
    expect(trabajoMuscularWorkout({}, [set(1)], [changed]).legacy).toBe(true)
  })
  it('snapshot vacío conocido no adivina clasificación con información posterior', () => {
    const snapshot = crearSnapshotMuscular([set(1)], [])
    expect(trabajoMuscularWorkout({ muscleSnapshot: snapshot }, [set(1)], [local]).coverage.classified).toBe(0)
  })
  it('todos los oficiales aportan al menos una zona concreta, sin duplicar secundarios/principales', () => {
    for (const c of CATALOGO_EJERCICIOS) {
      expect(c.primaryMuscles.every(m => ZONAS_MUSCULARES.includes(m as typeof ZONAS_MUSCULARES[number]))).toBe(true)
      expect(c.secondaryMuscles.some(m => c.primaryMuscles.includes(m))).toBe(false)
    }
  })
})
