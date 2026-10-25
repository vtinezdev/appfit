import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../shared/db/db'
import { getSettings } from '../../../shared/db/settings'
import { guardar, guardarZancada, ZancadaInvalida } from './caminosRepo'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('caminosRepo', () => {
  it('guarda la configuración y devuelve la anterior para deshacer', async () => {
    expect(await guardar({ inicio: '2026-10-12', ruta: ['ingles'] })).toBeUndefined()
    expect((await getSettings()).caminos).toEqual({ inicio: '2026-10-12', ruta: ['ingles'] })
    expect(await guardar(undefined)).toEqual({ inicio: '2026-10-12', ruta: ['ingles'] })
    expect((await getSettings()).caminos).toBeUndefined()
  })

  it('guarda la zancada propia, vuelve a la estimada y rechaza cifras fuera de rango', async () => {
    expect(await guardarZancada(74)).toBeUndefined()
    expect((await getSettings()).zancadaCm).toBe(74)
    expect(await guardarZancada(undefined)).toBe(74)
    expect((await getSettings()).zancadaCm).toBeUndefined()
    await expect(guardarZancada(10)).rejects.toBeInstanceOf(ZancadaInvalida)
    expect((await getSettings()).zancadaCm).toBeUndefined()
  })
})
