import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../shared/db/db'
import { normalizeName } from '../../../shared/lib/text'
import * as routinesRepo from './routinesRepo'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('routinesRepo.sustituirEjercicio', () => {
  it('sustituye por uno del catálogo (creándolo) y deshace con restaurar', async () => {
    const viejo = await db.exercises.add({ nombre: 'Curl en polea', nombreNorm: normalizeName('Curl en polea'), grupo: 'Bíceps', primaryMuscles: ['biceps'] })
    const id = await routinesRepo.guardar({ nombre: 'Tirón', exerciseIds: [viejo], objetivos: { [viejo]: { series: 3, repsMin: 10, repsMax: 12 } } })
    const antes = await routinesRepo.sustituirEjercicio(id, viejo, { tipo: 'catalogo', catalogId: 'appfit:curl-barra' })
    const nuevo = (await db.exercises.toArray()).find((e) => e.catalogId === 'appfit:curl-barra')!
    expect(nuevo).toBeDefined()
    expect(await routinesRepo.obtener(id)).toEqual({ id, nombre: 'Tirón', exerciseIds: [nuevo.id], objetivos: { [nuevo.id]: { series: 3, repsMin: 10, repsMax: 12 } } })
    await routinesRepo.restaurar(antes)
    expect((await routinesRepo.obtener(id))?.exerciseIds).toEqual([viejo])
  })

  it('un fallo no deja nada a medias', async () => {
    const a = await db.exercises.add({ nombre: 'A', nombreNorm: 'a', grupo: 'Pecho' })
    const b = await db.exercises.add({ nombre: 'B', nombreNorm: 'b', grupo: 'Pecho' })
    const id = await routinesRepo.guardar({ nombre: 'R', exerciseIds: [a, b] })
    await expect(routinesRepo.sustituirEjercicio(id, a, { tipo: 'local', id: b })).rejects.toThrow('Ese ejercicio ya está en la rutina.')
    await expect(routinesRepo.sustituirEjercicio(id, a, { tipo: 'catalogo', catalogId: 'appfit:no-existe' })).rejects.toThrow()
    expect((await routinesRepo.obtener(id))?.exerciseIds).toEqual([a, b])
    expect(await db.exercises.count()).toBe(2)
  })
})
