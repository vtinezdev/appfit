import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../shared/db/db'
import * as exercisesRepo from './exercisesRepo'
import * as setsRepo from './setsRepo'
import * as workoutsRepo from './workoutsRepo'
import { exportarBackup, importarBackup } from '../../../shared/lib/backup'
import { trabajoMuscularWorkout } from '../lib/cargaMuscular'

beforeEach(async () => { await Promise.all(db.tables.map(t => t.clear())) })
async function preparar() {
  const workout = await workoutsRepo.empezar()
  const set = await setsRepo.agregarSeleccion(workout, { tipo: 'catalogo', catalogId: 'appfit:press-banca' })
  await setsRepo.actualizar(set, { reps: 8, peso: 60 })
  return workout
}
describe('cierre de sesión y persistencia semántica muscular', () => {
  it('cierre devuelve y guarda clasificación coherente con series sin alterar registros anteriores', async () => {
    const id = await preparar()
    const before = await exportarBackup()
    const result = await workoutsRepo.terminar(id)
    expect(await db.workouts.get(id)).toEqual(result.workout)
    expect(result.workout.muscleSnapshot?.exercises[0]).toMatchObject({ nombre: 'Press banca', primaryMuscles: ['pecho'], secondaryMuscles: ['triceps', 'hombros'] })
    expect(result.sets).toEqual(before.sets)
    expect((await exportarBackup()).exercises).toEqual(before.exercises)
    expect(result.workout.fin).toBeDefined()
    expect(result.workout.muscleSnapshot).not.toHaveProperty('colors')
  })
  it('personalizado y registro desconocido se conservan, sin inventar asociaciones', async () => {
    const id = await workoutsRepo.empezar()
    await setsRepo.agregarSeleccion(id, { tipo: 'personalizado', nombre: 'Mi remo', musculo: 'espalda', equipo: 'bandas' })
    await setsRepo.agregarConEjercicio(id, 'Ejercicio antiguo desconocido')
    const { workout, sets } = await workoutsRepo.terminar(id)
    const work = trabajoMuscularWorkout(workout, sets, [])
    expect(work.coverage).toMatchObject({ classified: 1, total: 2 })
    expect(work.muscles.espalda.score).toBeGreaterThan(0)
    expect(work.unclassified).toContain('Ejercicio antiguo desconocido')
  })
  it('idempotente: segundo cierre no modifica fin ni snapshot', async () => {
    const id = await preparar()
    const first = await workoutsRepo.terminar(id)
    await db.exercises.update(first.sets[0].exerciseId, { primaryMuscles: ['core'] })
    expect((await workoutsRepo.terminar(id)).workout).toEqual(first.workout)
  })
  it('fallo de persistencia revierte fin/snapshot y permite reintentar', async () => {
    const id = await preparar()
    const before = await exportarBackup()
    const spy = vi.spyOn(db.workouts, 'update').mockRejectedValueOnce(new Error('fallo'))
    await expect(workoutsRepo.terminar(id)).rejects.toThrow('fallo')
    spy.mockRestore()
    const after = await exportarBackup()
    expect(after.workouts).toEqual(before.workouts)
    expect(after.sets).toEqual(before.sets)
    expect(after.exercises).toEqual(before.exercises)
    expect((await workoutsRepo.terminar(id)).workout.fin).toBeDefined()
  })
  it('entrenamiento vacío también termina con snapshot vacío', async () => {
    const id = await workoutsRepo.empezar()
    expect((await workoutsRepo.terminar(id)).workout.muscleSnapshot).toEqual({ version: 1, exercises: [] })
  })
  it('backup v2 conserva snapshot y mapa sin depender del catálogo posterior', async () => {
    const id = await preparar()
    const result = await workoutsRepo.terminar(id)
    const original = await exportarBackup()
    await importarBackup(JSON.stringify(original))
    const restored = await exportarBackup()
    expect(restored.workouts).toEqual(original.workouts)
    expect(restored.sets).toEqual(original.sets)
    expect(trabajoMuscularWorkout(restored.workouts[0], restored.sets, []).levels).toEqual(trabajoMuscularWorkout(result.workout, result.sets, []).levels)
    expect(restored.version).toBe(3)
    expect(db.verno).toBe(7)
  })
  it('cierre antiguo sin snapshot se mantiene intacto; lectura no escribe', async () => {
    const id = await preparar()
    await db.workouts.update(id, { fin: 9 })
    const before = await exportarBackup()
    const result = await workoutsRepo.terminar(id)
    expect(result.workout.muscleSnapshot).toBeUndefined()
    expect(trabajoMuscularWorkout(result.workout, result.sets, await exercisesRepo.listar()).legacy).toBe(true)
    expect((await exportarBackup()).workouts).toEqual(before.workouts)
  })
})
