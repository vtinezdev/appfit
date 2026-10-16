import { describe, expect, it } from 'vitest'
import { leerComunidad, puedePublicarEnComunidad, validarComunidad } from './comunidad'

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
    expect(leerComunidad({ ...c, creador: 'privado' })).toEqual({ ...c, soloCreadorPublica: false })
    for (const dato of [{ miembros: -1 }, { miembros: '3' }, { miembros: 1.5 }, { id: '' }, { nombre: '' }]) expect(leerComunidad({ ...c, ...dato })).toBeNull()
    expect(leerComunidad(null)).toBeNull()
  })
  it('lee el permiso y conserva el modo abierto de las respuestas anteriores', () => {
    const c = { id: 'grupo', nombre: 'Actualizaciones', descripcion: '', miembros: 2, unida: true, mia: false }
    expect(leerComunidad(c)?.soloCreadorPublica).toBe(false)
    expect(leerComunidad({ ...c, solo_creador_publica: true })?.soloCreadorPublica).toBe(true)
    expect(leerComunidad({ ...c, solo_creador_publica: 'false' })).toBeNull()
  })
  it('solo permite publicar a miembros y, si se restringe, a su creador', () => {
    const c = { id: 'grupo', nombre: 'Actualizaciones', descripcion: '', miembros: 2, unida: true, mia: false, soloCreadorPublica: false }
    expect(puedePublicarEnComunidad(c)).toBe(true)
    expect(puedePublicarEnComunidad({ ...c, soloCreadorPublica: true })).toBe(false)
    expect(puedePublicarEnComunidad({ ...c, soloCreadorPublica: true, mia: true })).toBe(true)
    expect(puedePublicarEnComunidad({ ...c, unida: false, mia: true })).toBe(false)
  })
})
