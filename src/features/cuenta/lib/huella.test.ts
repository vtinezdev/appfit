import { describe, expect, it } from 'vitest'
import { migrarBackup } from '../../../shared/lib/backup'
import { huellaBackup } from './huella'

const copia = (exportedAt: string, kcal = 100) => migrarBackup({
  version: 3, exportedAt, dbVersion: 11, foods: [], settings: [], exercises: [], routines: [], workouts: [], sets: [],
  entries: [{ id: 1, fecha: '2026-10-13', kcal }],
})

describe('huellaBackup', () => {
  it('no cambia con la fecha de exportación', async () => {
    expect(await huellaBackup(copia('2026-10-13T10:00:00Z'))).toBe(await huellaBackup(copia('2026-10-14T08:00:00Z')))
  })

  it('cambia con los datos', async () => {
    const h = await huellaBackup(copia('x'))
    expect(h).toMatch(/^[0-9a-f]{64}$/)
    expect(await huellaBackup(copia('x', 101))).not.toBe(h)
  })

  it('conserva las huellas guardadas por las versiones anteriores', async () => {
    const b = copia('2026-10-29T10:00:00Z')
    const { exportedAt: _, ...contenido } = b
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(contenido)))
    const anterior = Array.from(new Uint8Array(bytes), x => x.toString(16).padStart(2, '0')).join('')
    expect(await huellaBackup(b)).toBe(anterior)
  })
})
