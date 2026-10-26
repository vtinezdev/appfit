import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../shared/db/db'
import * as pasosRepo from './pasosRepo'

beforeEach(async () => {
  await db.pasos.clear()
})

describe('pasosRepo', () => {
  it('un total por día: guardar sustituye y devuelve el anterior', async () => {
    expect(await pasosRepo.guardar('2026-10-12', 8000)).toBeUndefined()
    const antes = await pasosRepo.guardar('2026-10-12', 9500)
    expect(antes).toMatchObject({ fecha: '2026-10-12', pasos: 8000 })
    await pasosRepo.guardar('2026-10-10', 3000)
    expect((await pasosRepo.todos()).map((p) => [p.fecha, p.pasos])).toEqual([['2026-10-10', 3000], ['2026-10-12', 9500]])
  })

  it('deshacer: restaurar devuelve el día a como estaba', async () => {
    const nuevo = await pasosRepo.guardar('2026-10-12', 8000)
    await pasosRepo.restaurar('2026-10-12', nuevo)
    expect(await db.pasos.count()).toBe(0)
    await pasosRepo.guardar('2026-10-12', 8000)
    const borrado = await pasosRepo.borrar('2026-10-12')
    expect(await db.pasos.count()).toBe(0)
    await pasosRepo.restaurar('2026-10-12', borrado)
    expect(await pasosRepo.todos()).toEqual([borrado])
  })

  it('rechaza cifras no válidas sin escribir', async () => {
    await expect(pasosRepo.guardar('2026-10-12', 0)).rejects.toBeInstanceOf(pasosRepo.PasosInvalidos)
    await expect(pasosRepo.guardar('2026-10-12', 100_001)).rejects.toBeInstanceOf(pasosRepo.PasosInvalidos)
    await expect(pasosRepo.guardar('2026-10-12', 12.5)).rejects.toBeInstanceOf(pasosRepo.PasosInvalidos)
    expect(await db.pasos.count()).toBe(0)
  })

  it('una semana de una vez: sustituye, añade y borra los días vacíos; deshacer la deja como estaba', async () => {
    await pasosRepo.guardar('2026-10-19', 8000)
    await pasosRepo.guardar('2026-10-20', 5000)
    const antes = await pasosRepo.todos()
    const anteriores = await pasosRepo.guardarSemana([{ fecha: '2026-10-19', pasos: 9000 }, { fecha: '2026-10-20', pasos: null }, { fecha: '2026-10-21', pasos: 9000 }])
    expect((await pasosRepo.todos()).map((p) => [p.fecha, p.pasos])).toEqual([['2026-10-19', 9000], ['2026-10-21', 9000]])
    expect(anteriores.map((a) => [a.fecha, a.antes?.pasos])).toEqual([['2026-10-19', 8000], ['2026-10-20', 5000], ['2026-10-21', undefined]])
    await pasosRepo.restaurarSemana(anteriores)
    expect(await pasosRepo.todos()).toEqual(antes)
  })

  it('una semana con un día no válido no escribe nada', async () => {
    await expect(pasosRepo.guardarSemana([{ fecha: '2026-10-19', pasos: 9000 }, { fecha: '2026-10-20', pasos: 100_001 }])).rejects.toBeInstanceOf(pasosRepo.PasosInvalidos)
    expect(await db.pasos.count()).toBe(0)
  })
})
