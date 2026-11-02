import { beforeEach, expect, it } from 'vitest'
import fixture from '../../test/fixtures/backup-v1.json?raw'
import { db } from '../db/db'
import { exportarBackup, importarBackup } from './backup'
import { BackupCambiadoError, contenidoBackup } from './contenidoBackup'

beforeEach(async () => { await Promise.all(db.tables.map(t => t.clear())) })

it.each(['entries', 'agua', 'settings'] as const)('la restauración automática conserva una escritura nueva en %s', async tabla => {
  await importarBackup(fixture)
  const esperado = await exportarBackup()
  if (tabla === 'entries') await db.entries.update(1, { gramos: 999 })
  if (tabla === 'agua') await db.agua.add({ fecha: '2026-10-29', ml: 250, tomas: [250] })
  if (tabla === 'settings') await db.settings.update(1, { aguaObjetivoMl: 2500 })
  const editado = await exportarBackup()
  await expect(importarBackup(fixture, esperado)).rejects.toBeInstanceOf(BackupCambiadoError)
  expect(contenidoBackup(await exportarBackup())).toBe(contenidoBackup(editado))
})

it('compara e importa en una misma transacción y devuelve exactamente la foto importada', async () => {
  await importarBackup(fixture)
  const esperado = await exportarBackup()
  const remoto = { ...esperado, entries: esperado.entries.slice(0, 1) }
  const importado = await importarBackup(JSON.stringify(remoto), { ...esperado, exportedAt: 'otra fecha de exportación' })
  expect(importado.entries).toHaveLength(1)
  expect(contenidoBackup(await exportarBackup())).toBe(contenidoBackup(importado))
  await db.agua.add({ fecha: '2026-10-29', ml: 500, tomas: [500] })
  expect(importado.agua).toEqual([])
  expect(contenidoBackup(await exportarBackup())).not.toBe(contenidoBackup(importado))
})
