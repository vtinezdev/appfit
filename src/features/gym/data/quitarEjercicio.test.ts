import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../shared/db/db'
import { exportarBackup, importarBackup } from '../../../shared/lib/backup'
import { ordenEjerciciosSesion } from '../lib/workout'
import * as repo from './workoutsRepo'
import * as setsRepo from './setsRepo'

beforeEach(async () => { await Promise.all(db.tables.map(t => t.clear())) })

async function preparar(fin?: number) {
  await db.exercises.bulkPut([1, 2, 3].map(id => ({ id, nombre: `Ejercicio ${id}`, nombreNorm: `ejercicio ${id}`, grupo: 'General', primaryMuscles: ['core'] })))
  await db.routines.put({ id: 1, nombre: 'Rutina', exerciseIds: [1, 2, 3] })
  await db.workouts.put({ id: 1, inicio: 100, ...(fin ? { fin } : {}), routineId: 1, notas: 'Notas que se conservan', ordenEjercicios: [2, 1, 3],
    ...(fin ? { muscleSnapshot: { version: 1, exercises: [1, 2].map(exerciseId => ({ exerciseId, nombre: `Nombre histórico ${exerciseId}`, primaryMuscles: ['pecho'], secondaryMuscles: ['triceps'] })) } } : {}) })
  await db.workouts.put({ id: 2, inicio: 1, fin: 2 })
  await db.sets.bulkPut([
    { id: 1, workoutId: 1, exerciseId: 1, orden: 0, reps: 8, peso: 60, createdAt: 100, rir: 0 },
    { id: 2, workoutId: 1, exerciseId: 1, orden: 1, reps: 12, peso: 20, createdAt: 101, tipo: 'calentamiento', rir: 3 },
    { id: 3, workoutId: 1, exerciseId: 2, orden: 0, reps: 10, peso: 40, createdAt: 102 },
    { id: 4, workoutId: 2, exerciseId: 1, orden: 0, reps: 10, peso: 50, createdAt: 1 },
  ])
}

async function datos() { const b = await exportarBackup(); delete (b as Partial<typeof b>).exportedAt; return b }

describe('quitar ejercicio solo de una sesión', () => {
  it('borra todas sus series, conserva catálogo/rutina/otra sesión y evita que vuelva desde la rutina', async () => {
    await preparar()
    const antes = await datos()
    const captura = await repo.quitarEjercicio(1, 1)
    expect(captura?.sets.map(s => s.id)).toEqual([1, 2])
    const despues = await datos()
    expect(despues.sets.map(s => s.id)).toEqual([3, 4])
    expect(despues.exercises).toEqual(antes.exercises)
    expect(despues.routines).toEqual(antes.routines)
    expect(despues.workouts[1]).toEqual(antes.workouts[1])
    expect(despues.workouts[0]).toMatchObject({ notas: antes.workouts[0].notas, ordenEjercicios: [2, 1, 3], ejerciciosOmitidos: [1] })
    expect(ordenEjerciciosSesion([1, 2, 3], [2], [2, 1, 3], [1])).toEqual([2, 3])
  })

  it('deshacer restaura exactamente ids, orden, calentamiento y RIR, sin cambiar otros datos', async () => {
    await preparar(200)
    const antes = await datos()
    await repo.restaurarEjercicio((await repo.quitarEjercicio(1, 1))!)
    expect(await datos()).toEqual(antes)
  })

  it('quita y restaura un ejercicio de rutina que aún no tiene series', async () => {
    await preparar()
    const captura = (await repo.quitarEjercicio(1, 3))!
    expect(captura.sets).toEqual([])
    expect((await repo.obtener(1))?.ejerciciosOmitidos).toEqual([3])
    await repo.restaurarEjercicio(captura)
    expect((await repo.obtener(1))?.ejerciciosOmitidos).toBeUndefined()
  })

  it('un doble borrado es idempotente y no duplica omisiones', async () => {
    await preparar()
    const [a, b] = await Promise.all([repo.quitarEjercicio(1, 1), repo.quitarEjercicio(1, 1)])
    expect([a, b].filter(Boolean)).toHaveLength(1)
    expect((await repo.obtener(1))?.ejerciciosOmitidos).toEqual([1])
  })

  it('deshacer no revierte otras omisiones, notas ni cambios de orden', async () => {
    await preparar()
    const captura = (await repo.quitarEjercicio(1, 1))!
    await repo.quitarEjercicio(1, 2)
    await repo.guardarNotas(1, 'Nota nueva')
    await repo.guardarOrden(1, [3, 1, 2])
    await repo.restaurarEjercicio(captura)
    expect(await repo.obtener(1)).toMatchObject({ ejerciciosOmitidos: [2], notas: 'Nota nueva', ordenEjercicios: [3, 1, 2] })
    expect((await setsRepo.delWorkout(1)).map(s => s.id)).toEqual([1, 2])
  })

  it('el mapa de un entreno terminado pierde solo ese ejercicio y Deshacer conserva su clasificación histórica', async () => {
    await preparar(200)
    const original = (await repo.obtener(1))!.muscleSnapshot
    const captura = (await repo.quitarEjercicio(1, 1))!
    expect((await repo.obtener(1))!.muscleSnapshot!.exercises.map(e => e.exerciseId)).toEqual([2])
    await db.exercises.update(1, { primaryMuscles: ['gluteos'] })
    await repo.restaurarEjercicio(captura)
    expect((await repo.obtener(1))!.muscleSnapshot).toEqual(original)
  })

  it('conserva una sesión antigua sin snapshot al quitar y restaurar', async () => {
    await preparar()
    await db.workouts.update(1, { fin: 200 })
    await repo.restaurarEjercicio((await repo.quitarEjercicio(1, 1))!)
    expect((await repo.obtener(1))!.muscleSnapshot).toBeUndefined()
  })

  it('fallo al guardar la omisión revierte también el borrado de series', async () => {
    await preparar(200)
    const antes = await datos()
    const spy = vi.spyOn(db.workouts, 'update').mockRejectedValueOnce(new Error('fallo'))
    await expect(repo.quitarEjercicio(1, 1)).rejects.toThrow('fallo')
    spy.mockRestore()
    expect(await datos()).toEqual(antes)
  })

  it('fallo al restaurar conserva la sesión omitida y permite reintentar', async () => {
    await preparar()
    const captura = (await repo.quitarEjercicio(1, 1))!
    const antes = await datos()
    const spy = vi.spyOn(db.workouts, 'update').mockRejectedValueOnce(new Error('fallo'))
    await expect(repo.restaurarEjercicio(captura)).rejects.toThrow('fallo')
    spy.mockRestore()
    expect(await datos()).toEqual(antes)
    await repo.restaurarEjercicio(captura)
    expect((await setsRepo.delWorkout(1)).map(s => s.id)).toEqual([1, 2, 3])
  })

  it('añadir de nuevo desde el selector cancela la omisión; Deshacer no pierde la serie nueva', async () => {
    await preparar()
    const captura = (await repo.quitarEjercicio(1, 1))!
    const nueva = await setsRepo.agregarSeleccion(1, { tipo: 'local', id: 1 })
    expect((await repo.obtener(1))?.ejerciciosOmitidos).toBeUndefined()
    await repo.restaurarEjercicio(captura)
    expect((await setsRepo.delWorkout(1)).map(s => s.id)).toContain(nueva)
    expect((await setsRepo.delWorkout(1)).filter(s => s.exerciseId === 1)).toHaveLength(3)
    await repo.restaurarEjercicio(captura)
    expect((await setsRepo.delWorkout(1)).filter(s => s.exerciseId === 1)).toHaveLength(3)
  })

  it('export/import conserva la omisión y restaurar después no crea series huérfanas si el entreno ya no existe', async () => {
    await preparar()
    const captura = (await repo.quitarEjercicio(1, 1))!
    const backup = await exportarBackup()
    await importarBackup(JSON.stringify(backup))
    expect((await repo.obtener(1))?.ejerciciosOmitidos).toEqual([1])
    await repo.borrar(1)
    await expect(repo.restaurarEjercicio(captura)).rejects.toThrow('ya no está disponible')
    expect(await setsRepo.delWorkout(1)).toEqual([])
  })
})
