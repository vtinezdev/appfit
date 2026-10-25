import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../shared/db/db'
import { updateSettings } from '../../../shared/db/settings'
import type { BorradorRuta } from '../lib/rutasPropias'
import * as repo from './rutasPropiasRepo'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

const borrador: BorradorRuta = {
  nombre: ' Tarragona – Valencia ',
  salida: { nombre: 'Tarragona', provincia: 'Tarragona', lat: 41.1191, lon: 1.2454 },
  etapas: [{ nombre: 'Castelló de la Plana', km: 160.04 }, { nombre: 'Valencia', km: 79.98 }],
}

describe('rutasPropiasRepo', () => {
  it('crea limpiando textos y redondeando km a un decimal', async () => {
    const id = await repo.crear(borrador, 5)
    expect(await repo.obtener(id)).toMatchObject({ nombre: 'Tarragona – Valencia', etapas: [{ km: 160 }, { km: 80 }], createdAt: 5, updatedAt: 5 })
  })

  it('no guarda una ruta sin llegada o con km vacíos', async () => {
    await expect(repo.crear({ ...borrador, etapas: [] })).rejects.toThrow('Elige el lugar de llegada.')
    await expect(repo.crear({ ...borrador, etapas: [{ nombre: 'Valencia', km: undefined }] })).rejects.toThrow('Indica los km hasta Valencia.')
    expect(await db.rutasPropias.count()).toBe(0)
  })

  it('actualiza y no deja borrar una ruta que está en el viaje', async () => {
    const id = await repo.crear(borrador, 1)
    await repo.actualizar(id, { ...borrador, nombre: 'Hasta Valencia' }, 9)
    expect(await repo.obtener(id)).toMatchObject({ nombre: 'Hasta Valencia', createdAt: 1, updatedAt: 9 })
    await updateSettings({ caminos: { inicio: '2026-10-12', ruta: [`propia:${id}`] } })
    await expect(repo.borrar(id)).rejects.toThrow(repo.RutaEnUso)
    await updateSettings({ caminos: undefined })
    await repo.borrar(id)
    expect(await repo.listar()).toEqual([])
  })
})
