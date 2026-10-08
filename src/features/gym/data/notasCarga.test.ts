import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../shared/db/db'
import { exportarBackup, importarBackup } from '../../../shared/lib/backup'
import * as workoutsRepo from './workoutsRepo'
import * as setsRepo from './setsRepo'

beforeEach(async () => {
  await Promise.all(db.tables.map(t => t.clear()))
  await db.workouts.bulkPut([{ id: 1, inicio: new Date('2026-10-08T12:00').getTime(), notas: 'General' }, { id: 2, inicio: 10, fin: 20, notasEjercicios: { 1: 'Anterior' } }])
  await db.exercises.put({ id: 1, nombre: 'Dominadas propias', nombreNorm: 'dominadas propias', grupo: 'Espalda' })
  await db.sets.bulkPut([{ id: 1, workoutId: 1, exerciseId: 1, reps: 8, peso: 20, orden: 0, createdAt: 100, rir: 0 }, { id: 2, workoutId: 1, exerciseId: 1, reps: 10, peso: 10, orden: 1, createdAt: 101, tipo: 'calentamiento' }])
})
describe('notas y carga de una sesión', () => {
  it('notas concurrentes conservan otros ejercicios y la nota general; vacío borra solo la suya', async () => {
    await Promise.all([workoutsRepo.guardarNotaEjercicio(1, 1, ' Asiento 4 '), workoutsRepo.guardarNotaEjercicio(1, 2, 'Otra máquina')])
    expect(await workoutsRepo.obtener(1)).toMatchObject({ notas: 'General', notasEjercicios: { 1: 'Asiento 4', 2: 'Otra máquina' } })
    await workoutsRepo.guardarNotaEjercicio(1, 1, ' ')
    expect((await workoutsRepo.obtener(1))?.notasEjercicios).toEqual({ 2: 'Otra máquina' })
    expect(await workoutsRepo.ultimaNotaEjercicio(1, 100)).toEqual({ nota: 'Anterior', inicio: 10 })
    await db.workouts.update(2, { ejerciciosOmitidos: [1] })
    expect(await workoutsRepo.ultimaNotaEjercicio(1, 100)).toBeUndefined()
  })
  it('cambia todas sus series y conserva reps/RIR/calentamiento y otras sesiones', async () => {
    expect(await workoutsRepo.configurarCarga(1, 1, { modo: 'lastre', pesoCorporal: 75 })).toEqual([1, 2])
    expect(await db.sets.get(1)).toMatchObject({ modoCarga: 'lastre', peso: 0, reps: 8, rir: 0, pesoCorporal: 75 })
    expect(await db.sets.get(2)).toMatchObject({ tipo: 'calentamiento', reps: 10 })
    await setsRepo.actualizar(1, { peso: 10 })
    expect(await workoutsRepo.configurarCarga(1, 1, { modo: 'lastre', pesoCorporal: 75 })).toEqual([])
    expect((await setsRepo.delWorkout(1))[0].peso).toBe(10)
    expect((await workoutsRepo.obtener(2))?.cargasEjercicios).toBeUndefined()
  })
  it('la nueva serie copia la configuración de sesión incluso sin series efectivas', async () => {
    await workoutsRepo.configurarCarga(1, 1, { modo: 'asistencia' })
    const id = await setsRepo.agregar(1, 1)
    expect(await db.sets.get(id)).toMatchObject({ modoCarga: 'asistencia', peso: 0 })
    expect((await db.sets.get(id))?.pesoCorporal).toBeUndefined()
  })
  it('el primer snapshot usa solo pesajes hasta la fecha de la sesión y no cambia al añadir otro pesaje', async () => {
    await db.sets.clear()
    await db.sets.put({ id: 3, workoutId: 2, exerciseId: 1, peso: 0, reps: 10, orden: 0, createdAt: 1, modoCarga: 'corporal', pesoCorporal: 60 })
    await db.pesos.bulkPut([{ id: 1, fecha: '2026-10-07', kg: 72, createdAt: 1 }, { id: 2, fecha: '2026-10-10', kg: 90, createdAt: 2 }])
    const id = await setsRepo.agregar(1, 1)
    expect((await db.sets.get(id))?.pesoCorporal).toBe(72)
    await db.pesos.put({ id: 4, fecha: '2026-10-08', kg: 75, createdAt: 3 })
    expect((await db.sets.get(await setsRepo.agregar(1, 1)))?.pesoCorporal).toBe(72)
  })
  it('quitar/Deshacer y backup restauran notas, configuración y snapshots', async () => {
    await workoutsRepo.guardarNotaEjercicio(1, 1, 'Agarre habitual')
    await workoutsRepo.configurarCarga(1, 1, { modo: 'corporal', pesoCorporal: 72 })
    const captura = (await workoutsRepo.quitarEjercicio(1, 1))!
    expect((await workoutsRepo.obtener(1))?.notasEjercicios).toBeUndefined()
    expect((await workoutsRepo.obtener(1))?.cargasEjercicios).toBeUndefined()
    await workoutsRepo.restaurarEjercicio(captura)
    await importarBackup(JSON.stringify(await exportarBackup()))
    expect(await workoutsRepo.obtener(1)).toMatchObject({ notasEjercicios: { 1: 'Agarre habitual' }, cargasEjercicios: { 1: { modo: 'corporal', pesoCorporal: 72 } } })
    expect((await setsRepo.delWorkout(1))[0]).toMatchObject({ modoCarga: 'corporal', pesoCorporal: 72 })
  })
  it('el fallo de configuración revierte también todas las series', async () => {
    const antes = await setsRepo.delWorkout(1)
    const spy = vi.spyOn(db.workouts, 'update').mockRejectedValueOnce(new Error('fallo'))
    await expect(workoutsRepo.configurarCarga(1, 1, { modo: 'lastre' })).rejects.toThrow('fallo')
    spy.mockRestore()
    expect(await setsRepo.delWorkout(1)).toEqual(antes)
  })
})
