import { describe, expect, it } from 'vitest'
import { ayudaCifras } from './ayudaCifras'

describe('ayuda de las cifras de Progreso', () => {
  it('con carga externa explica el 1RM solo si se estima', () => {
    expect(ayudaCifras('externa', true).map(d => d.nombre)).toEqual(['1RM estimado', 'Volumen', 'Cambio'])
    expect(ayudaCifras('externa', false)[0].nombre).toBe('Sin 1RM')
  })

  it('cada tipo de carga explica su comparación y siempre el cambio', () => {
    for (const modo of ['lastre', 'asistencia', 'corporal'] as const) {
      const ayuda = ayudaCifras(modo, false)
      expect(ayuda.at(-1)?.nombre).toBe('Cambio')
      expect(ayuda.some(d => d.texto.includes('1RM') || d.texto.includes('repeticiones'))).toBe(true)
    }
  })
})
