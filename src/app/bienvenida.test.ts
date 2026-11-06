import { describe, expect, it } from 'vitest'
import { AL_TERMINAR, pasosBienvenida, sistemasExplicados } from './bienvenida'
import { VERSION_TEXTOS_LEGALES } from '../shared/lib/legal'

describe('bienvenida', () => {
  it('con todo activo: entrada, módulos, perfil y semana', () => {
    expect(pasosBienvenida({})).toEqual(['entrada', 'modulos', 'perfil', 'semana'])
  })

  it('sin Nutrición no pide el perfil, que solo da el objetivo de comidas', () => {
    expect(pasosBienvenida({ modulos: { nutricion: false } })).toEqual(['entrada', 'modulos', 'semana'])
  })

  it('explica Cumbres y Ritmo siempre, y la Liga solo con Gimnasio', () => {
    expect(sistemasExplicados({}).map((s) => s.nombre)).toEqual(['Cumbres', 'Ritmo', 'Liga'])
    expect(sistemasExplicados({ modulos: { gym: false } }).map((s) => s.nombre)).toEqual(['Cumbres', 'Ritmo'])
  })

  it('al terminar, deja de estar pendiente y guarda la versión de los textos legales aceptada', () => {
    expect(AL_TERMINAR).toEqual({ bienvenidaPendiente: undefined, textosLegalesAceptados: VERSION_TEXTOS_LEGALES })
  })
})
