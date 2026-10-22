import { afterEach, expect, it, vi } from 'vitest'
import { db } from './db'
import { prepararDatos } from './arranque'

afterEach(() => vi.restoreAllMocks())

it('un fallo de apertura se puede reintentar sin borrar registros existentes', async () => {
  await prepararDatos()
  await db.pesos.put({ id: 1, fecha: '2026-10-21', kg: 72.5, createdAt: Date.now() })
  const antes = await db.pesos.toArray()
  vi.spyOn(db, 'open').mockRejectedValueOnce(new Error('Almacenamiento no disponible'))
  await expect(prepararDatos()).rejects.toThrow('Almacenamiento no disponible')
  await prepararDatos()
  expect(await db.pesos.toArray()).toEqual(antes)
})
