import { describe, expect, it } from 'vitest'
import { leerComunidad, validarComunidad } from './comunidad'

describe('comunidades', () => {
  it('valida los límites antes de publicar', () => {
    expect(validarComunidad('  ', '')).not.toBeNull()
    expect(validarComunidad('ab', '')).not.toBeNull()
    expect(validarComunidad('x'.repeat(61), '')).not.toBeNull()
    expect(validarComunidad('Entreno', 'x'.repeat(301))).not.toBeNull()
    expect(validarComunidad('  Entreno  ', '')).toBeNull()
  })
  it('descarta respuestas inválidas y elimina campos adicionales', () => {
    const c = { id: 'grupo', nombre: 'Entreno', descripcion: 'Para todos', miembros: 3, unida: true, mia: false }
    expect(leerComunidad({ ...c, creador: 'privado' })).toEqual(c)
    for (const dato of [{ miembros: -1 }, { miembros: '3' }, { miembros: 1.5 }, { id: '' }, { nombre: '' }]) expect(leerComunidad({ ...c, ...dato })).toBeNull()
    expect(leerComunidad(null)).toBeNull()
  })
})
