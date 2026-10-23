import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../shared/db/db'
import { exportarBackup } from '../../../shared/lib/backup'
import * as repo from './workoutsRepo'

beforeEach(async () => { await Promise.all(db.tables.map(t => t.clear())) })

/** Press banca (1) y Remo (2) en la rutina; Press con mancuernas (3) hecho hace tiempo: 3 × 10 · 32 kg. */
async function preparar(series: { id: number; exerciseId: number; orden: number; reps: number; peso: number; tipo?: 'calentamiento'; realizada?: boolean; rir?: number }[]) {
  await db.exercises.bulkPut([
    { id: 1, nombre: 'Press banca', nombreNorm: 'press banca', grupo: 'Pecho', primaryMuscles: ['pecho'], equipment: ['barra'] },
    { id: 2, nombre: 'Remo', nombreNorm: 'remo', grupo: 'Espalda', primaryMuscles: ['espalda'], equipment: ['barra'] },
    { id: 3, nombre: 'Press con mancuernas', nombreNorm: 'press con mancuernas', grupo: 'Pecho', primaryMuscles: ['pecho'], equipment: ['mancuernas'] },
  ])
  await db.routines.put({ id: 1, nombre: 'Torso', exerciseIds: [1, 2], objetivos: { 1: { series: 3, repsMin: 6, repsMax: 10 } } })
  await db.workouts.bulkPut([{ id: 1, inicio: 1000, routineId: 1 }, { id: 2, inicio: 10, fin: 20 }])
  await db.sets.bulkPut([
    ...[0, 1, 2].map(o => ({ id: 90 + o, workoutId: 2, exerciseId: 3, orden: o, reps: 10, peso: 32, createdAt: 10 + o })),
    ...series.map(s => ({ workoutId: 1, createdAt: 100 + s.id, ...s })),
    { id: 20, workoutId: 1, exerciseId: 2, orden: 0, reps: 10, peso: 60, createdAt: 200 },
  ])
}
async function datos() { const b = await exportarBackup(); delete (b as Partial<typeof b>).exportedAt; return b }
const delEntreno = async () => (await db.sets.where('workoutId').equals(1).sortBy('id'))

describe('sustituir un ejercicio en la sesión', () => {
  it('solo pasan las series sin hacer, con sus reps y los kg de la última vez del nuevo; deshacer lo deja exacto', async () => {
    await preparar([
      { id: 1, exerciseId: 1, orden: 0, reps: 12, peso: 20, tipo: 'calentamiento', realizada: true },
      { id: 2, exerciseId: 1, orden: 1, reps: 8, peso: 80, realizada: true, rir: 2 },
      { id: 3, exerciseId: 1, orden: 2, reps: 8, peso: 80, rir: 1 },
      { id: 4, exerciseId: 1, orden: 3, reps: 6, peso: 80 },
    ])
    const antes = await datos()
    const c = await repo.sustituirEnSesion(1, 1, { tipo: 'local', id: 3 })
    expect(c.movidas.map(s => s.id)).toEqual([3, 4])
    expect(c.creadas).toEqual([])
    const sets = await delEntreno()
    expect(sets.filter(s => s.exerciseId === 1).map(s => s.id)).toEqual([1, 2])
    expect(sets.filter(s => s.exerciseId === 3)).toEqual([
      expect.objectContaining({ id: 3, orden: 0, reps: 8, peso: 32 }), expect.objectContaining({ id: 4, orden: 1, reps: 6, peso: 32 })])
    expect(sets.find(s => s.id === 3)).not.toHaveProperty('rir')
    // El nuevo va detrás de Press banca, que se queda con sus series hechas; la rutina no cambia.
    expect(await db.workouts.get(1)).toMatchObject({ ordenEjercicios: [1, 3, 2] })
    expect((await db.workouts.get(1))?.ejerciciosOmitidos).toBeUndefined()
    expect(await db.routines.get(1)).toEqual(antes.routines[0])
    await repo.deshacerSustitucion(c)
    expect(await datos()).toEqual(antes)
  })

  it('sin series hechas, el nuevo ocupa su sitio y el de la rutina se omite; los calentamientos siguen siéndolo', async () => {
    await preparar([{ id: 1, exerciseId: 1, orden: 0, reps: 12, peso: 20, tipo: 'calentamiento' }, { id: 3, exerciseId: 1, orden: 1, reps: 8, peso: 80 }])
    const antes = await datos()
    const c = await repo.sustituirEnSesion(1, 1, { tipo: 'local', id: 3 })
    const w = await db.workouts.get(1)
    expect(w).toMatchObject({ ordenEjercicios: [3, 2], ejerciciosOmitidos: [1] })
    const sets = await delEntreno()
    expect(sets.find(s => s.id === 1)).toMatchObject({ exerciseId: 3, tipo: 'calentamiento', reps: 12 })
    await repo.deshacerSustitucion(c)
    expect(await datos()).toEqual(antes)
  })

  it('con todo hecho, el nuevo empieza con una serie; deshacer la quita', async () => {
    await preparar([{ id: 3, exerciseId: 1, orden: 0, reps: 8, peso: 80, realizada: true }])
    const antes = await datos()
    const c = await repo.sustituirEnSesion(1, 1, { tipo: 'local', id: 3 })
    expect(c.creadas).toHaveLength(1)
    expect(await db.sets.get(c.creadas[0])).toMatchObject({ workoutId: 1, exerciseId: 3, reps: 10, peso: 32 })
    await repo.deshacerSustitucion(c)
    expect(await datos()).toEqual(antes)
  })

  it('«Cambiar también en la rutina» sustituye en la rutina con su objetivo; deshacer la restaura', async () => {
    await preparar([{ id: 3, exerciseId: 1, orden: 0, reps: 8, peso: 80 }])
    const antes = await datos()
    const c = await repo.sustituirEnSesion(1, 1, { tipo: 'local', id: 3 }, true)
    expect(await db.routines.get(1)).toMatchObject({ exerciseIds: [3, 2], objetivos: { 3: { series: 3 } } })
    // Ya no está en la rutina: no hace falta omitirlo.
    expect((await db.workouts.get(1))?.ejerciciosOmitidos).toBeUndefined()
    await repo.deshacerSustitucion(c)
    expect(await datos()).toEqual(antes)
  })

  it('del catálogo crea el ejercicio; un fallo a mitad no deja nada a medias; el mismo ejercicio no vale', async () => {
    await preparar([{ id: 3, exerciseId: 1, orden: 0, reps: 8, peso: 80 }])
    const antes = await datos()
    const espia = vi.spyOn(db.workouts, 'update').mockRejectedValueOnce(new Error('fallo'))
    await expect(repo.sustituirEnSesion(1, 1, { tipo: 'catalogo', catalogId: 'appfit:aperturas-mancuernas' })).rejects.toThrow()
    espia.mockRestore()
    expect(await datos()).toEqual(antes)
    await expect(repo.sustituirEnSesion(1, 1, { tipo: 'local', id: 1 })).rejects.toThrow('mismo ejercicio')
    const c = await repo.sustituirEnSesion(1, 1, { tipo: 'catalogo', catalogId: 'appfit:aperturas-mancuernas' })
    expect(await db.exercises.get(c.nuevo)).toMatchObject({ catalogId: 'appfit:aperturas-mancuernas' })
    expect((await db.sets.get(3))?.exerciseId).toBe(c.nuevo)
  })
})
