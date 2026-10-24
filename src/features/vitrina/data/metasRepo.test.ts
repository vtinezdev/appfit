import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../shared/db/db'
import { getSettings } from '../../../shared/db/settings'
import * as metasRepo from './metasRepo'

const HOY = '2026-10-20'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('metasRepo', () => {
  it('crea, edita el plazo y borra con «Deshacer» en su sitio', async () => {
    const a = await metasRepo.crear({ tipo: 'semanas', valor: 8, fecha: '2026-12-31' }, HOY, 'a')
    await metasRepo.crear({ tipo: 'km-mes', valor: 80, mes: '2026-11', fecha: '2026-11-15' }, HOY, 'b')
    expect(a).toEqual({ id: 'a', tipo: 'semanas', valor: 8, fecha: '2026-12-31', creada: HOY })
    // En km de un mes el plazo es el mes: no se guarda `fecha`.
    expect((await getSettings()).metas?.[1]).toEqual({ id: 'b', tipo: 'km-mes', valor: 80, mes: '2026-11', creada: HOY })
    await metasRepo.editar('a', { valor: 10, fecha: '2027-01-31' }, HOY)
    expect((await getSettings()).metas?.[0]).toMatchObject({ valor: 10, fecha: '2027-01-31', creada: HOY })
    const quitada = await metasRepo.borrar('a')
    expect((await getSettings()).metas?.map((m) => m.id)).toEqual(['b'])
    await metasRepo.restaurar(quitada!)
    expect((await getSettings()).metas?.map((m) => m.id)).toEqual(['a', 'b'])
    await metasRepo.borrar('a'); await metasRepo.borrar('b')
    expect((await getSettings()).metas).toBeUndefined()
  })

  it('una meta de récord tiene que superar lo ya levantado', async () => {
    await db.sets.add({ id: 1, workoutId: 1, exerciseId: 3, orden: 0, reps: 5, peso: 100, createdAt: 1 })
    await expect(metasRepo.crear({ tipo: 'record', valor: 95, exerciseId: 3 }, HOY)).rejects.toThrow(/Ya has levantado 100 kg/)
    await expect(metasRepo.crear({ tipo: 'record', valor: 110, exerciseId: 3 }, HOY)).resolves.toMatchObject({ exerciseId: 3, valor: 110 })
  })
})
