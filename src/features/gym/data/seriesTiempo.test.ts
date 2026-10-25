import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../shared/db/db'
import type { SetEntry } from '../../../shared/db/types'
import { calcularCargaEjercicio } from '../lib/cargaMuscular'
import type { ConPorTiempo, ConSegundos } from '../lib/tiempo'
import * as exercisesRepo from './exercisesRepo'
import * as setsRepo from './setsRepo'
import * as workoutsRepo from './workoutsRepo'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

async function sesionConPlancha() {
  await db.exercises.put({ id: 8, nombre: 'Plancha', nombreNorm: 'plancha', grupo: 'Core', catalogId: 'appfit:plancha' })
  await db.workouts.put({ id: 1, inicio: Date.now() - 600_000 })
  const id = await setsRepo.agregar(1, 8)
  return id
}

describe('series por tiempo (A29)', () => {
  it('se guardan los segundos y se puede confirmar sin repeticiones', async () => {
    const id = await sesionConPlancha()
    await expect(setsRepo.confirmar(id, true)).rejects.toThrow()
    await setsRepo.actualizar(id, { segundos: 45 })
    await setsRepo.confirmar(id, true)
    const s = (await db.sets.get(id)) as SetEntry & ConSegundos
    expect(s).toMatchObject({ segundos: 45, reps: 0, realizada: true })
  })

  it('cambiar los segundos de una serie marcada la desmarca, como las repeticiones', async () => {
    const id = await sesionConPlancha()
    await setsRepo.actualizar(id, { segundos: 45 })
    await setsRepo.confirmar(id, true)
    await setsRepo.actualizar(id, { segundos: 50 })
    expect((await db.sets.get(id))?.realizada).toBe(false)
  })

  it('rechaza segundos imposibles', async () => {
    const id = await sesionConPlancha()
    await expect(setsRepo.actualizar(id, { segundos: 4000 })).rejects.toThrow()
    await expect(setsRepo.actualizar(id, { segundos: 2.5 })).rejects.toThrow()
  })

  it('«marcar todas y terminar» incluye las series con segundos', async () => {
    const id = await sesionConPlancha()
    const vacia = await setsRepo.agregar(1, 8)
    await setsRepo.actualizar(id, { segundos: 30 })
    const { sets } = await workoutsRepo.terminar(1, [], true)
    expect(sets.find((s) => s.id === id)?.realizada).toBe(true)
    expect(sets.find((s) => s.id === vacia)?.realizada).toBe(false)
  })

  it('una serie nueva no trae repeticiones ni los 20 kg por defecto; copia los segundos y la carga de la anterior por tiempo', async () => {
    const id = await sesionConPlancha()
    expect(await db.sets.get(id)).toMatchObject({ reps: 0, peso: 0 })
    await setsRepo.actualizar(id, { segundos: 40, peso: 10 })
    const otra = (await db.sets.get(await setsRepo.agregar(1, 8))) as SetEntry & ConSegundos
    expect(otra).toMatchObject({ reps: 0, peso: 10, segundos: 40 })
  })

  it('marcar un ejercicio a mano como por tiempo o por repeticiones', async () => {
    await sesionConPlancha()
    await exercisesRepo.guardarPorTiempo(8, false)
    expect(((await db.exercises.get(8)) as ConPorTiempo).porTiempo).toBe(false)
  })

  it('cuentan como series para el mapa muscular', () => {
    const plancha = { exerciseId: 8, reps: 0, peso: 0, segundos: 45 } as SetEntry & ConSegundos
    const carga = calcularCargaEjercicio([plancha, { ...plancha, segundos: 0 }])
    expect(carga.sets).toBe(1)
    expect(carga.stimulus).toBeCloseTo(1)
  })
})
