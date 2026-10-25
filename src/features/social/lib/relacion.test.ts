import { describe, expect, it } from 'vitest'
import { accionSeguir, nombreVisible, textoRelacion, type Persona } from './relacion'

const persona = (sigo: Persona['sigo'], meSigue: Persona['meSigue'], nombre: string | null = null): Persona => ({ alias: 'ana', nombre, sigo, meSigue })

describe('relación', () => {
  it('nombre o alias', () => {
    expect(nombreVisible(persona('no', 'no', 'Ana G.'))).toBe('Ana G.')
    expect(nombreVisible(persona('no', 'no'))).toBe('@ana')
  })

  it('describe los dos sentidos', () => {
    expect(textoRelacion(persona('no', 'no'))).toBeNull()
    expect(textoRelacion(persona('aceptado', 'aceptado'))).toBe('Os seguís')
    expect(textoRelacion(persona('aceptado', 'no'))).toBe('Siguiendo')
    expect(textoRelacion(persona('no', 'aceptado'))).toBe('Te sigue')
    expect(textoRelacion(persona('pendiente', 'no'))).toBe('Solicitud enviada')
    expect(textoRelacion(persona('aceptado', 'pendiente'))).toBe('Siguiendo · Quiere seguirte')
    expect(textoRelacion(persona('pendiente', 'aceptado'))).toBe('Te sigue · Solicitud enviada')
  })

  it('la acción de seguir según cómo esté', () => {
    expect(accionSeguir(persona('no', 'aceptado'))).toBe('seguir')
    expect(accionSeguir(persona('pendiente', 'no'))).toBe('cancelar')
    expect(accionSeguir(persona('aceptado', 'no'))).toBe('dejar')
  })
})
