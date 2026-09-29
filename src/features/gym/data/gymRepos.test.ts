import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../shared/db/db'
import * as exercisesRepo from './exercisesRepo'
import * as routinesRepo from './routinesRepo'
import * as setsRepo from './setsRepo'
import * as workoutsRepo from './workoutsRepo'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('exercisesRepo.obtenerOCrear', () => {
  it('crea el ejercicio si no existe', async () => {
    const id = await exercisesRepo.obtenerOCrear('  Press banca ')
    expect(await db.exercises.get(id)).toMatchObject({ nombre: 'Press banca', grupo: 'General' })
  })

  it('devuelve el existente comparando el nombre normalizado', async () => {
    const id = await exercisesRepo.obtenerOCrear('Press banca')
    expect(await exercisesRepo.obtenerOCrear('press BANCA')).toBe(id)
    expect(await db.exercises.count()).toBe(1)
  })

  it('dos llamadas simultáneas con el mismo nombre crean un solo ejercicio', async () => {
    const [a, b] = await Promise.all([exercisesRepo.obtenerOCrear('Remo'), exercisesRepo.obtenerOCrear('remo')])
    expect(a).toBe(b)
    expect(await db.exercises.count()).toBe(1)
  })
})

describe('routinesRepo', () => {
  it('guardar crea y después actualiza la misma rutina', async () => {
    const id = await routinesRepo.guardar({ nombre: 'Pierna', exerciseIds: [1] })
    expect(await routinesRepo.guardar({ id, nombre: 'Pierna A', exerciseIds: [1, 2] })).toBe(id)
    expect(await routinesRepo.listar()).toEqual([{ id, nombre: 'Pierna A', exerciseIds: [1, 2] }])
  })

  it('borrar elimina la rutina', async () => {
    const id = await routinesRepo.guardar({ nombre: 'Pierna', exerciseIds: [] })
    await routinesRepo.borrar(id)
    expect(await routinesRepo.obtener(id)).toBeUndefined()
  })
})

describe('workoutsRepo', () => {
  it('empezar crea un entreno activo, con rutina opcional', async () => {
    const id = await workoutsRepo.empezar(7)
    expect(await workoutsRepo.activo()).toMatchObject({ id, routineId: 7 })
  })

  it('empezar sin rutina no guarda routineId', async () => {
    const id = await workoutsRepo.empezar()
    expect(await db.workouts.get(id)).not.toHaveProperty('routineId')
  })

  it('un doble toque no crea dos entrenos activos', async () => {
    const [a, b] = await Promise.all([workoutsRepo.empezar(), workoutsRepo.empezar()])
    expect(a).toBe(b)
    expect(await db.workouts.count()).toBe(1)
  })

  it('con un entreno en curso, empezar devuelve ese', async () => {
    const id = await workoutsRepo.empezar()
    expect(await workoutsRepo.empezar(3)).toBe(id)
    expect(await db.workouts.count()).toBe(1)
  })

  it('terminar cierra el entreno y permite empezar otro', async () => {
    const id = await workoutsRepo.empezar()
    await workoutsRepo.terminar(id)
    expect(await workoutsRepo.activo()).toBeUndefined()
    expect(await workoutsRepo.terminados()).toHaveLength(1)
    expect(await workoutsRepo.empezar()).not.toBe(id)
  })
})

describe('setsRepo', () => {
  async function preparar() {
    const workoutId = await workoutsRepo.empezar()
    const exerciseId = await exercisesRepo.obtenerOCrear('Sentadilla')
    return { workoutId, exerciseId }
  }

  it('la primera serie usa 8 × 20 kg y orden 0', async () => {
    const { workoutId, exerciseId } = await preparar()
    const id = await setsRepo.agregar(workoutId, exerciseId)
    expect(await db.sets.get(id)).toMatchObject({ workoutId, exerciseId, orden: 0, reps: 8, peso: 20 })
  })

  it('una serie nueva repite la última del ejercicio, también de entrenos anteriores', async () => {
    const { workoutId, exerciseId } = await preparar()
    const id = await setsRepo.agregar(workoutId, exerciseId)
    await setsRepo.actualizar(id, { reps: 5, peso: 100 })
    await workoutsRepo.terminar(workoutId)
    const otro = await workoutsRepo.empezar()
    const nueva = await setsRepo.agregar(otro, exerciseId)
    expect(await db.sets.get(nueva)).toMatchObject({ workoutId: otro, orden: 0, reps: 5, peso: 100 })
  })

  it('dos toques seguidos dan dos series con orden distinto', async () => {
    const { workoutId, exerciseId } = await preparar()
    await Promise.all([setsRepo.agregar(workoutId, exerciseId), setsRepo.agregar(workoutId, exerciseId)])
    const ordenes = (await setsRepo.delWorkout(workoutId)).map((s) => s.orden).sort()
    expect(ordenes).toEqual([0, 1])
  })

  it('tras borrar una serie intermedia, la siguiente no repite orden', async () => {
    const { workoutId, exerciseId } = await preparar()
    await setsRepo.agregar(workoutId, exerciseId)
    const segunda = await setsRepo.agregar(workoutId, exerciseId)
    await setsRepo.agregar(workoutId, exerciseId)
    await setsRepo.borrar(segunda)
    await setsRepo.agregar(workoutId, exerciseId)
    const ordenes = (await setsRepo.delWorkout(workoutId)).map((s) => s.orden).sort()
    expect(ordenes).toEqual([0, 2, 3])
  })

  it('agregarConEjercicio crea el ejercicio y su primera serie', async () => {
    const workoutId = await workoutsRepo.empezar()
    const id = await setsRepo.agregarConEjercicio(workoutId, 'Dominadas')
    const set = await db.sets.get(id)
    expect((await db.exercises.get(set!.exerciseId))?.nombre).toBe('Dominadas')
  })

  it('agregarConEjercicio reutiliza el ejercicio si ya existe', async () => {
    const { workoutId, exerciseId } = await preparar()
    const id = await setsRepo.agregarConEjercicio(workoutId, 'sentadilla')
    expect((await db.sets.get(id))?.exerciseId).toBe(exerciseId)
    expect(await db.exercises.count()).toBe(1)
  })

  it('borrar devuelve la serie y restaurar la recupera con el mismo id', async () => {
    const { workoutId, exerciseId } = await preparar()
    const id = await setsRepo.agregar(workoutId, exerciseId)
    const original = await db.sets.get(id)
    const borrada = await setsRepo.borrar(id)
    expect(borrada).toEqual(original)
    expect(await db.sets.get(id)).toBeUndefined()
    await setsRepo.restaurar([borrada!])
    expect(await db.sets.get(id)).toEqual(original)
  })

  it('borrar una serie que no existe devuelve undefined', async () => {
    expect(await setsRepo.borrar(999)).toBeUndefined()
  })
})
