import { describe, expect, it } from 'vitest'
import { retornoDeReferencias } from './volver'

describe('retornoDeReferencias', () => {
  it('desde Ajustes vuelve a Ajustes con el foco en la fila Referencias', () => {
    expect(retornoDeReferencias('ajustes')).toEqual({ tab: 'ajustes', etiqueta: 'Ajustes', enfocarFila: true })
  })

  it('desde Nutrición o Perfil vuelve allí, sin fila que enfocar', () => {
    expect(retornoDeReferencias('nutricion')).toEqual({ tab: 'nutricion', etiqueta: 'Nutrición', enfocarFila: false })
    expect(retornoDeReferencias('perfil')).toEqual({ tab: 'perfil', etiqueta: 'Perfil', enfocarFila: false })
  })
})
