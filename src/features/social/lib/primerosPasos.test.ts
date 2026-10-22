import { describe, expect, it } from 'vitest'
import { primerosPasos } from './primerosPasos'

describe('primerosPasos', () => {
  it('cuenta los pasos hechos con los datos reales', () => {
    expect(primerosPasos({ codigo: true, comunidad: false, entreno: true })).toMatchObject({ hechos: 2, total: 3 })
    expect(primerosPasos({ codigo: false, comunidad: false, entreno: false }).hechos).toBe(0)
  })
  it('sin saber lo remoto no da una cifra', () => {
    const r = primerosPasos({ entreno: true })
    expect(r.hechos).toBeNull()
    expect(r.pasos.map((p) => p.hecho)).toEqual([null, null, true])
  })
})
