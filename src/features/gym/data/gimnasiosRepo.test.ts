import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../shared/db/db'
import type { Exercise } from '../../../shared/db/types'
import * as gimnasiosRepo from './gimnasiosRepo'
import * as setsRepo from './setsRepo'
import * as workoutsRepo from './workoutsRepo'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

const ejercicio = (id: number, nombre: string, equipment: string[]) =>
  db.exercises.add({ id, nombre, nombreNorm: nombre.toLowerCase(), grupo: 'Pierna', equipment } as Exercise)

/** Un entreno terminado con una serie realizada del ejercicio. */
async function hecho(exerciseId: number, reps: number, peso: number, gimnasioId?: number, inicio = 1000, rir?: number) {
  const workoutId = await db.workouts.add({ inicio, fin: inicio + 60_000, ...(gimnasioId !== undefined ? { gimnasioId } : {}) } as never)
  await db.sets.add({ workoutId, exerciseId, orden: 0, reps, peso, createdAt: inicio, realizada: true, ...(rir !== undefined ? { rir } : {}), ...(gimnasioId !== undefined ? { gimnasioId } : {}) } as never)
  return workoutId
}

describe('gimnasiosRepo', () => {
  it('crea, lista por nombre, renombra y no admite duplicados', async () => {
    const playa = await gimnasiosRepo.crear('Gym Playa')
    await gimnasiosRepo.crear('Atlas')
    await expect(gimnasiosRepo.crear('gym playa')).rejects.toThrow('Ya tienes')
    expect((await gimnasiosRepo.listar()).map(g => g.nombre)).toEqual(['Atlas', 'Gym Playa'])
    await gimnasiosRepo.renombrar(playa, 'Gym Playa Norte')
    expect((await db.gimnasios.get(playa))?.nombreNorm).toBe('gym playa norte')
  })

  it('solo borra un gimnasio que ningún entreno usa', async () => {
    const playa = await gimnasiosRepo.crear('Gym Playa')
    const libre = await gimnasiosRepo.crear('Atlas')
    await workoutsRepo.empezar(undefined, playa)
    await expect(gimnasiosRepo.borrar(playa)).rejects.toThrow('no se puede borrar')
    await gimnasiosRepo.borrar(libre)
    expect(await db.gimnasios.count()).toBe(1)
  })
})

describe('series en otro gimnasio', () => {
  beforeEach(async () => {
    await ejercicio(1, 'Prensa', ['maquina'])
    await ejercicio(2, 'Press banca', ['barra'])
  })

  it('la primera vez en una máquina copia reps del habitual sin kg y estampa el gimnasio', async () => {
    await hecho(1, 10, 120)
    const playa = await gimnasiosRepo.crear('Gym Playa')
    const w = await workoutsRepo.empezar(undefined, playa)
    const id = await setsRepo.agregar(w, 1)
    expect(await db.sets.get(id)).toMatchObject({ reps: 10, peso: 0, gimnasioId: playa })
  })

  it('la segunda vez usa los kg de ese gimnasio, no los del habitual', async () => {
    const playa = await gimnasiosRepo.crear('Gym Playa')
    await hecho(1, 10, 120, undefined, 1000)
    await hecho(1, 12, 80, playa, 2000)
    await hecho(1, 10, 125, undefined, 3000)
    const w = await workoutsRepo.empezar(undefined, playa)
    expect(await db.sets.get(await setsRepo.agregar(w, 1))).toMatchObject({ reps: 12, peso: 80, gimnasioId: playa })
  })

  it('en el habitual ignora lo hecho en otros gimnasios', async () => {
    const playa = await gimnasiosRepo.crear('Gym Playa')
    await hecho(1, 10, 120, undefined, 1000)
    await hecho(1, 12, 80, playa, 2000)
    const w = await workoutsRepo.empezar()
    const s = await db.sets.get(await setsRepo.agregar(w, 1))
    expect(s).toMatchObject({ reps: 10, peso: 120 })
    expect(s?.gimnasioId).toBeUndefined()
  })

  it('la barra comparte historial y no lleva gimnasio', async () => {
    await hecho(2, 5, 100)
    const playa = await gimnasiosRepo.crear('Gym Playa')
    const w = await workoutsRepo.empezar(undefined, playa)
    const s = await db.sets.get(await setsRepo.agregar(w, 2))
    expect(s).toMatchObject({ reps: 5, peso: 100 })
    expect(s?.gimnasioId).toBeUndefined()
  })

  it('las series objetivo de una rutina siguen la misma regla', async () => {
    await hecho(1, 10, 120)
    await hecho(2, 5, 100)
    const routineId = await db.routines.add({ nombre: 'Pierna', exerciseIds: [1, 2], objetivos: { 1: { series: 2, repsMin: 8, repsMax: 12 }, 2: { series: 1, repsMin: 5, repsMax: 5 } } } as never)
    const playa = await gimnasiosRepo.crear('Gym Playa')
    const w = await workoutsRepo.empezar(routineId, playa)
    const sets = await db.sets.where('workoutId').equals(w).sortBy('createdAt')
    expect(sets.map(s => [s.exerciseId, s.reps, s.peso, s.gimnasioId])).toEqual([[1, 10, 0, playa], [1, 10, 0, playa], [2, 5, 100, undefined]])
  })

  it('cambiarGimnasio reestampa, vuelve a precargar las pendientes y conserva las realizadas', async () => {
    const playa = await gimnasiosRepo.crear('Gym Playa')
    await hecho(1, 10, 120, undefined, 1000)
    await hecho(1, 12, 80, playa, 2000)
    const w = await workoutsRepo.empezar()
    const hecha = await setsRepo.agregar(w, 1)
    const pendiente = await setsRepo.agregar(w, 1)
    await setsRepo.confirmar(hecha, true)
    const barra = await setsRepo.agregar(w, 2)
    expect(await workoutsRepo.cambiarGimnasio(w, playa)).toEqual([pendiente])
    expect(await db.workouts.get(w)).toMatchObject({ gimnasioId: playa })
    expect(await db.sets.get(hecha)).toMatchObject({ reps: 10, peso: 120, realizada: true, gimnasioId: playa })
    expect(await db.sets.get(pendiente)).toMatchObject({ reps: 12, peso: 80, gimnasioId: playa })
    expect((await db.sets.get(barra))?.gimnasioId).toBeUndefined()
    // Volver al habitual quita el gimnasio del entreno y de las series.
    await workoutsRepo.cambiarGimnasio(w, undefined)
    expect((await db.workouts.get(w))?.gimnasioId).toBeUndefined()
    expect((await db.sets.get(hecha))?.gimnasioId).toBeUndefined()
    expect(await db.sets.get(pendiente)).toMatchObject({ reps: 10, peso: 120 })
  })

  it('cambiarGimnasio a uno nuevo deja sin kg las pendientes', async () => {
    await hecho(1, 10, 120)
    const w = await workoutsRepo.empezar()
    const pendiente = await setsRepo.agregar(w, 1)
    await workoutsRepo.cambiarGimnasio(w, await gimnasiosRepo.crear('Gym Playa'))
    expect(await db.sets.get(pendiente)).toMatchObject({ reps: 10, peso: 0 })
  })

  it('repetir conserva el gimnasio del entreno', async () => {
    const playa = await gimnasiosRepo.crear('Gym Playa')
    const origen = await hecho(1, 12, 80, playa)
    const w = await workoutsRepo.repetir(origen)
    expect((await db.workouts.get(w))?.gimnasioId).toBe(playa)
    expect((await db.sets.where('workoutId').equals(w).first())?.gimnasioId).toBe(playa)
  })
})

describe('nombre del gimnasio habitual', () => {
  it('se guarda en los ajustes, vacío lo quita y no choca con otros gimnasios', async () => {
    await gimnasiosRepo.crear('Gym Playa')
    await gimnasiosRepo.renombrarHabitual('  Basic-Fit Centro ')
    expect(await gimnasiosRepo.nombreHabitual()).toBe('Basic-Fit Centro')
    await expect(gimnasiosRepo.renombrarHabitual('gym playa')).rejects.toThrow('otro gimnasio')
    await expect(gimnasiosRepo.crear('basic-fit centro')).rejects.toThrow('habitual')
    await gimnasiosRepo.renombrarHabitual('')
    expect(await gimnasiosRepo.nombreHabitual()).toBeUndefined()
  })
})
