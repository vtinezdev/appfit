import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../shared/db/db'
import { getSettings } from '../../../shared/db/settings'
import { guardar } from './cumbresRepo'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('cumbresRepo', () => {
  it('guarda la configuración y devuelve la anterior para deshacer', async () => {
    expect(await guardar({ inicio: '2026-10-11', ruta: ['aneto'] })).toBeUndefined()
    expect((await getSettings()).cumbres).toEqual({ inicio: '2026-10-11', ruta: ['aneto'] })
    expect(await guardar({ inicio: '2026-10-11', ruta: ['teide'] })).toEqual({ inicio: '2026-10-11', ruta: ['aneto'] })
    expect(await guardar(undefined)).toEqual({ inicio: '2026-10-11', ruta: ['teide'] })
    expect((await getSettings()).cumbres).toBeUndefined()
  })
})
