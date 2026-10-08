import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../shared/db/db'
import { exportarBackup, importarBackup } from '../../../shared/lib/backup'
import * as setsRepo from './setsRepo'
import * as workoutsRepo from './workoutsRepo'
import { recomendarProgresion } from '../lib/progresion'
import type { SetEntry } from '../../../shared/db/types'
const s = (patch: Partial<SetEntry> = {}): SetEntry => ({ id: 1, workoutId: 1, exerciseId: 1, reps: 10, peso: 20, orden: 0, createdAt: 1, ...patch })
beforeEach(async () => {
  await Promise.all(db.tables.map(t => t.clear()))
  await db.exercises.put({ id: 1, nombre: 'Remo propio', nombreNorm: 'remo propio', grupo: 'Espalda', primaryMuscles: ['espalda'] })
  await db.workouts.put({ id: 1, inicio: 10 })
  await db.sets.put(s())
})
describe('persistencia ejecución, técnica y realización', () => {
  it('configura sesión/habitual sin reescribir histórico y la precarga respeta la preferencia', async () => {
    await db.workouts.put({ id: 2, inicio: 1, fin: 2 })
    await db.sets.put(s({ id: 2, workoutId: 2 }))
    const config = { ejecucion: 'unilateral' as const, agarre: { orientacion: 'neutro' as const } }
    expect(await workoutsRepo.configurarEjecucion(1, 1, config, true)).toEqual([1])
    expect(await db.sets.get(1)).toMatchObject({ reps: 0, peso: 0, ejecucion: 'unilateral', realizada: false })
    expect((await db.sets.get(2))?.ejecucion).toBeUndefined()
    expect((await db.exercises.get(1))?.ejecucionHabitual).toEqual(config)
    const nueva = await setsRepo.agregar(1, 1)
    expect((await db.sets.get(nueva))?.ejecucion).toBe('unilateral')
  })
  it('la confirmación sobrevive a recargar y solo cambios físicos la invalidan', async () => {
    await setsRepo.confirmar(1, true)
    await setsRepo.actualizar(1, { rir: 0 })
    expect((await db.sets.get(1))?.realizada).toBe(true)
    await setsRepo.actualizar(1, { reps: 10 })
    expect((await db.sets.get(1))?.realizada).toBe(true)
    await setsRepo.actualizar(1, { agarre: { orientacion: 'prono' } })
    expect((await db.sets.get(1))?.realizada).toBe(false)
    await setsRepo.confirmar(1, true)
    await setsRepo.actualizar(1, { bajadas: [{ id: 'x', reps: 8, peso: 10 }] })
    expect((await db.sets.get(1))?.realizada).toBe(false)
  })
  it('solo un lado confirmado es válido; ningún lado no se puede confirmar', async () => {
    await setsRepo.actualizar(1, { ejecucion: 'lados', lados: { izquierda: { reps: 8, peso: 15 } } })
    await setsRepo.confirmar(1, true)
    expect((await db.sets.get(1))?.realizada).toBe(true)
    await setsRepo.actualizar(1, { lados: { izquierda: { reps: 8, peso: 15, rir: 0 } } })
    expect((await db.sets.get(1))?.realizada).toBe(true)
    await setsRepo.actualizar(1, { lados: {} })
    await expect(setsRepo.confirmar(1, true)).rejects.toThrow()
  })
  it('finaliza todas las series como realizadas/pendientes sin inferir reps precargadas', async () => {
    await db.sets.put(s({ id: 2, orden: 1 }))
    const fin = await workoutsRepo.terminar(1, [1])
    expect(fin.sets.map(s => s.realizada)).toEqual([true, false])
    expect((await workoutsRepo.terminar(1, [2])).sets.map(s => s.realizada)).toEqual([true, false])
  })
  it('borra/restaura serie extendida y ejercicio con toda la semántica y backup opcional', async () => {
    await workoutsRepo.configurarEjecucion(1, 1, { ejecucion: 'lados' })
    const campos = { lados: { izquierda: { reps: 8, peso: 20, rir: 1 } }, soloNegativas: true, excentricaSeg: 3, bajadas: [{ id: 'b', peso: 0, reps: 0, lados: { izquierda: { reps: 6, peso: 15 } } }] }
    await setsRepo.actualizar(1, campos); await setsRepo.confirmar(1, true)
    const original = await db.sets.get(1)
    const borrada = await setsRepo.borrar(1); await setsRepo.restaurar([borrada!])
    expect(await db.sets.get(1)).toEqual(original)
    const captura = (await workoutsRepo.quitarEjercicio(1, 1))!
    expect((await db.workouts.get(1))?.ejecucionesEjercicios).toBeUndefined()
    await workoutsRepo.restaurarEjercicio(captura)
    expect(await db.sets.get(1)).toEqual(original)
    await importarBackup(JSON.stringify(await exportarBackup()))
    expect(await db.sets.get(1)).toEqual(original)
    expect((await db.workouts.get(1))?.ejecucionesEjercicios?.[1].ejecucion).toBe('lados')
  })
  it('guardar inválido y fallo transaccional conservan todas las filas', async () => {
    const original = await db.sets.get(1)
    await expect(setsRepo.actualizar(1, { excentricaSeg: Infinity })).rejects.toThrow()
    expect(await db.sets.get(1)).toEqual(original)
    const spy = vi.spyOn(db.workouts, 'update').mockRejectedValueOnce(new Error('fallo'))
    await expect(workoutsRepo.configurarEjecucion(1, 1, { ejecucion: 'unilateral' })).rejects.toThrow('fallo')
    spy.mockRestore(); expect(await db.sets.get(1)).toEqual(original)
  })
})
describe('progresión aplicada explícitamente', () => {
  async function preparar() {
    await db.exercises.update(1, { progresion: { series: 2, repsMin: 8, repsMax: 12, incrementoKg: 2.5 } })
    for (const id of [2, 3, 4]) {
      await db.workouts.put({ id, inicio: id, fin: id + 0.5 })
      await db.sets.bulkPut([0, 1].map(orden => s({ id: id * 10 + orden, workoutId: id, reps: 12, orden, realizada: true })))
    }
    return recomendarProgresion(1, s(), (await db.exercises.get(1))!.progresion, await db.workouts.toArray(), await db.sets.toArray(), 10).propuesta!
  }
  it('Aplicar actualiza/crea las series y conserva sus ids, sin marcar trabajo realizado', async () => {
    const p = await preparar()
    await workoutsRepo.decidirProgresion(1, 1, p.clave, 'aplicada')
    const ss = await setsRepo.delWorkout(1)
    expect(ss).toHaveLength(2); expect(ss[0].id).toBe(1)
    expect(ss.map(s => [s.reps, s.peso, s.realizada])).toEqual([[8, 22.5, false], [8, 22.5, false]])
    expect((await db.workouts.get(1))?.decisionesProgresion?.[1].decision).toBe('aplicada')
  })
  it('Mantener/Descartar solo guarda la decisión; lecturas no escriben', async () => {
    const p = await preparar(), antes = await db.sets.toArray()
    await workoutsRepo.decidirProgresion(1, 1, p.clave, 'mantener')
    expect(await db.sets.toArray()).toEqual(antes)
    await workoutsRepo.decidirProgresion(1, 1, p.clave, 'descartada')
    expect(await db.sets.toArray()).toEqual(antes)
  })
  it('rechaza propuesta obsoleta, series ya realizadas y sesiones terminadas', async () => {
    const p = await preparar()
    await expect(workoutsRepo.decidirProgresion(1, 1, 'obsoleta', 'aplicada')).rejects.toThrow('ha cambiado')
    const distinta = await db.sets.add({ workoutId: 1, exerciseId: 1, reps: 8, peso: 20, orden: 1, createdAt: 10, agarre: { orientacion: 'neutro' } })
    await expect(workoutsRepo.decidirProgresion(1, 1, p.clave, 'aplicada')).rejects.toThrow('misma variante')
    await db.sets.delete(distinta)
    await setsRepo.confirmar(1, true)
    await expect(workoutsRepo.decidirProgresion(1, 1, p.clave, 'aplicada')).rejects.toThrow('antes de completar')
    await db.workouts.update(1, { fin: 11 })
    await expect(workoutsRepo.decidirProgresion(1, 1, p.clave, 'mantener')).rejects.toThrow('activo')
  })
  it('fallo al guardar la decisión revierte también las series propuestas', async () => {
    const p = await preparar(), antes = await db.sets.toArray()
    const spy = vi.spyOn(db.workouts, 'update').mockRejectedValueOnce(new Error('fallo'))
    await expect(workoutsRepo.decidirProgresion(1, 1, p.clave, 'aplicada')).rejects.toThrow()
    spy.mockRestore(); expect(await db.sets.toArray()).toEqual(antes)
  })
})
