import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../shared/db/db'
import { SocialError } from './social'
import { borrarPublicacion } from './publicacionesRepo'

beforeEach(async () => {
  await Promise.all(db.tables.map(t => t.clear()))
  await db.workouts.bulkAdd([
    { id: 1, inicio: 1, fin: 2, publicacion: 'entreno', notas: 'Conservar' },
    { id: 2, inicio: 3, fin: 4, publicacion: 'otra' },
  ])
  await db.sets.add({ id: 1, workoutId: 1, exerciseId: 1, orden: 0, reps: 8, peso: 50, createdAt: 1 })
  await db.actividades.add({ id: 1, tipo: 'caminar', fecha: '2026-10-16', inicio: 1, duracionSeg: 60, distanciaM: 100, origen: 'manual', createdAt: 1, publicacion: 'actividad' })
})

const registros = async () => ({ workouts: await db.workouts.toArray(), sets: await db.sets.toArray(), actividades: await db.actividades.toArray() })

describe('borrar publicaciones desde Social', () => {
  it.each(['entreno', 'actividad'])('borra %s sin borrar el registro ni alterar otras publicaciones', async id => {
    const antes = await registros()
    const social = { borrarPublicacion: vi.fn().mockResolvedValue(undefined) }
    await borrarPublicacion(social, id)
    expect(social.borrarPublicacion).toHaveBeenCalledExactlyOnceWith(id)
    for (const w of antes.workouts) if (w.publicacion === id) delete w.publicacion
    for (const a of antes.actividades) if (a.publicacion === id) delete a.publicacion
    expect(await registros()).toEqual(antes)
  })

  it('un fallo del servidor conserva la marca y permite reintentar tras perder la respuesta', async () => {
    const antes = await registros()
    const social = { borrarPublicacion: vi.fn()
      .mockRejectedValueOnce(new Error('Sin conexión'))
      .mockRejectedValueOnce(new SocialError('No encontrado', 'no_encontrado')) }
    await expect(borrarPublicacion(social, 'entreno')).rejects.toThrow('Sin conexión')
    expect(await registros()).toEqual(antes)
    await borrarPublicacion(social, 'entreno')
    expect((await db.workouts.get(1))?.publicacion).toBeUndefined()
    expect(await db.sets.count()).toBe(1)
  })

  it('borrar una copia de comunidad o sin registro local conserva las marcas de seguidores', async () => {
    const antes = await registros()
    await borrarPublicacion({ borrarPublicacion: vi.fn().mockResolvedValue(undefined) }, 'comunidad')
    expect(await registros()).toEqual(antes)
  })
})
