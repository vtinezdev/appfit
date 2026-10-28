import { describe, expect, it } from 'vitest'
import { CATALOGO_IMAGENES_COMUNIDAD, filtrarImagenesComunidad, GRUPOS_IMAGEN_COMUNIDAD, leerImagenComunidad, nombreImagenComunidad } from './imagenComunidad'

describe('identificadores de imágenes de comunidades', () => {
  it('mantiene 36 opciones con identificadores únicos, estables y separados del catálogo personal', () => {
    expect(CATALOGO_IMAGENES_COMUNIDAD).toHaveLength(36)
    expect(new Set(CATALOGO_IMAGENES_COMUNIDAD.map(e => e.id)).size).toBe(CATALOGO_IMAGENES_COMUNIDAD.length)
    for (const e of CATALOGO_IMAGENES_COMUNIDAD) {
      expect(e.id).toMatch(/^lugar\.[a-z]+(?:-[a-z]+)*$/)
      expect(e.id.length).toBeLessThanOrEqual(64)
      expect(leerImagenComunidad(e.id)).toBe(e.id)
      expect(nombreImagenComunidad(e.id)).toBe(e.nombre)
      expect(GRUPOS_IMAGEN_COMUNIDAD.some(g => g.id === e.grupo)).toBe(true)
    }
  })

  it.each([null, undefined, false, 42, {}, [], '', 'lugar', 'lugar.inventado', 'lugar.Campamento', 'lugar.campamento ', 'paisaje.cumbre',
    'disciplina.pesas.bosque', 'exclusivo.tinez', '__proto__', 'constructor', 'https://ejemplo.com/avatar.png',
    'lugar.../../perfil', `lugar.${'a'.repeat(1000)}`,
  ])('devuelve iniciales para datos ausentes o desconocidos: %j', x => {
    expect(leerImagenComunidad(x)).toBeNull()
    expect(nombreImagenComunidad(x)).toBe('Iniciales de la comunidad')
  })
})

describe('búsqueda y grupos del catálogo', () => {
  it('encuentra deportes sin tildes y por palabras en cualquier orden', () => {
    expect(filtrarImagenesComunidad('  PÁDEL  ').map(e => e.id)).toEqual(['lugar.pista-cristal'])
    expect(filtrarImagenesComunidad('montaña bici').map(e => e.id)).toEqual(['lugar.sendero'])
    expect(filtrarImagenesComunidad('MTB').map(e => e.id)).toEqual(['lugar.sendero'])
    expect(filtrarImagenesComunidad('ping pong').map(e => e.id)).toEqual(['lugar.club-mesa'])
    expect(filtrarImagenesComunidad('judo').map(e => e.id)).toEqual(['lugar.dojo'])
  })

  it('combina la búsqueda con el grupo y no duplica ni omite opciones al recorrer los grupos', () => {
    expect(filtrarImagenesComunidad('Pádel', 'agua')).toEqual([])
    expect(filtrarImagenesComunidad('boxeo', 'combate').map(e => e.id)).toEqual(['lugar.ring'])
    const agrupadas = GRUPOS_IMAGEN_COMUNIDAD.flatMap(g => filtrarImagenesComunidad('', g.id))
    expect(agrupadas).toHaveLength(CATALOGO_IMAGENES_COMUNIDAD.length)
    expect(new Set(agrupadas.map(e => e.id)).size).toBe(agrupadas.length)
    expect(filtrarImagenesComunidad('sin coincidencias')).toEqual([])
    expect(filtrarImagenesComunidad('   ')).toHaveLength(CATALOGO_IMAGENES_COMUNIDAD.length)
  })
})
