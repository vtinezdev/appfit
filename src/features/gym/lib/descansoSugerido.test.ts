import { describe, expect, it } from 'vitest'
import { descansoSugerido, PISTA_DESCANSO, proponerDescanso, textoDescanso } from './descansoSugerido'

describe('descanso sugerido a quien entrena sin temporizador', () => {
  it('según el tipo del ejercicio del catálogo, como el creador de rutinas', () => {
    expect(descansoSugerido('appfit:press-banca')).toBe(120)
    expect(descansoSugerido('appfit:curl-barra')).toBe(90)
  })

  it('un ejercicio propio o desconocido, como aislamiento', () => {
    expect(descansoSugerido(undefined)).toBe(90)
    expect(descansoSugerido('appfit:no-existe')).toBe(90)
  })

  it('solo sin temporizador, sin descanso propio en la rutina y una sola vez', () => {
    expect(proponerDescanso(0, undefined, undefined)).toBe(true)
    expect(proponerDescanso(0, 0, ['entreno-series'])).toBe(true)
    expect(proponerDescanso(90, undefined, undefined)).toBe(false)
    expect(proponerDescanso(0, 150, undefined)).toBe(false)
    expect(proponerDescanso(0, undefined, [PISTA_DESCANSO])).toBe(false)
  })

  it('texto en minutos cuando son exactos', () => {
    expect(textoDescanso(120)).toBe('2 min')
    expect(textoDescanso(90)).toBe('90 s')
  })
})
