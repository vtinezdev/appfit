import { describe, expect, it } from 'vitest'
import { aplicarSola, AUSENCIA_REAPERTURA_MS } from './autoActualizacion'

const base = { appAndroid: true, hayActualizacion: true, momento: 'arranque' as const, ausenteMs: 0 }

describe('aplicarSola', () => {
  it('en la app de Android, una versión nueva se aplica al abrirla', () => {
    expect(aplicarSola(base)).toBe(true)
  })

  it('al volver a la app, solo tras un rato fuera, que cuenta como abrirla de nuevo', () => {
    expect(aplicarSola({ ...base, momento: 'vuelta', ausenteMs: AUSENCIA_REAPERTURA_MS })).toBe(true)
    expect(aplicarSola({ ...base, momento: 'vuelta', ausenteMs: AUSENCIA_REAPERTURA_MS - 1 })).toBe(false)
  })

  it('nunca mientras se usa, ni sin versión nueva, ni fuera de la app de Android (allí se avisa)', () => {
    expect(aplicarSola({ ...base, momento: 'uso' })).toBe(false)
    expect(aplicarSola({ ...base, hayActualizacion: false })).toBe(false)
    expect(aplicarSola({ ...base, appAndroid: false })).toBe(false)
  })
})
