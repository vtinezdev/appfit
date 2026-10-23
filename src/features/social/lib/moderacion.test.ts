import { describe, expect, it } from 'vitest'
import { accionesDenuncia, describirDenuncia, leerComunidadesSuspendidas, leerDenuncias, leerSuspendidos, textoMotivos, type Denuncia } from './moderacion'

const base = { id: 7, creada: '2026-10-19T10:00:00+00:00', denuncias: 2, motivos: ['acoso', 'spam'], detalles: ['Me insulta', null], contenido: '', autor: 'beto', autorSuspendido: false, vigente: true, resumen: null, texto: null }
const texto = { v: 1, tipo: 'texto', titulo: 'Hola', texto: 'Hola a todos' }

describe('leerDenuncias', () => {
  it('lee las agrupadas y descarta lo que no se puede pintar', () => {
    const [d, ...resto] = leerDenuncias([{ ...base, tipo: 'publicacion', resumen: texto }, { ...base, tipo: 'otra' }, { ...base, tipo: 'perfil', id: '7' }, null])
    expect(resto).toEqual([])
    expect(d).toMatchObject({ id: 7, tipo: 'publicacion', denuncias: 2, motivos: ['acoso', 'spam'], detalles: ['Me insulta'], autor: 'beto', vigente: true, creada: Date.parse(base.creada) })
    expect(d.resumen).toMatchObject({ titulo: 'Hola' })
    expect(leerDenuncias(null)).toEqual([])
  })
  it('ignora motivos desconocidos y solo guarda el texto de los comentarios', () => {
    const [d] = leerDenuncias([{ ...base, tipo: 'perfil', motivos: ['acoso', 'nuevo'], texto: 'no' }])
    expect(d.motivos).toEqual(['acoso'])
    expect(d.texto).toBeNull()
  })
})

describe('describirDenuncia', () => {
  const d = (x: Partial<Denuncia>): Denuncia => ({ ...leerDenuncias([{ ...base, tipo: 'perfil' }])[0], ...x })
  it('publicación: la actual o, si se borró, la guardada al denunciar', () => {
    expect(describirDenuncia(d({ tipo: 'publicacion', resumen: texto as Denuncia['resumen'] }))).toEqual({ etiqueta: 'Publicación de @beto', titulo: 'Hola', texto: 'Hola a todos' })
    expect(describirDenuncia(d({ tipo: 'publicacion', vigente: false, autor: null, contenido: `beto · ${JSON.stringify(texto)}` }))).toMatchObject({ etiqueta: 'Publicación', titulo: 'Hola' })
    expect(describirDenuncia(d({ tipo: 'publicacion', autor: null, contenido: 'beto · {roto' }))).toEqual({ etiqueta: 'Publicación', titulo: null, texto: '{roto' })
  })
  it('comentario, perfil y comunidad', () => {
    expect(describirDenuncia(d({ tipo: 'comentario', texto: 'Feo', contenido: 'beto · Antes' }))).toEqual({ etiqueta: 'Comentario de @beto', titulo: null, texto: 'Feo' })
    expect(describirDenuncia(d({ tipo: 'comentario', contenido: 'beto · Antes' })).texto).toBe('Antes')
    expect(describirDenuncia(d({ tipo: 'perfil', contenido: 'beto · Beto · Bio' }))).toEqual({ etiqueta: 'Perfil', titulo: '@beto', texto: 'Beto · Bio' })
    expect(describirDenuncia(d({ tipo: 'perfil', autor: null, contenido: 'beto' }))).toEqual({ etiqueta: 'Perfil', titulo: 'beto', texto: 'beto' })
    expect(describirDenuncia(d({ tipo: 'comunidad', contenido: 'Fuerza · Para levantar · más' }))).toEqual({ etiqueta: 'Comunidad de @beto', titulo: 'Fuerza', texto: 'Para levantar · más' })
  })
})

describe('accionesDenuncia', () => {
  const d = (x: Partial<Denuncia>): Denuncia => ({ ...leerDenuncias([{ ...base, tipo: 'perfil' }])[0], ...x })
  it('borrar solo contenido que sigue existiendo; suspender a quien tiene perfil activo; descartar siempre', () => {
    expect(accionesDenuncia(d({ tipo: 'publicacion' }))).toEqual(['borrar', 'suspender', 'descartar'])
    expect(accionesDenuncia(d({ tipo: 'comentario', vigente: false }))).toEqual(['suspender', 'descartar'])
    expect(accionesDenuncia(d({ tipo: 'perfil', autorSuspendido: true }))).toEqual(['descartar'])
    expect(accionesDenuncia(d({ tipo: 'comunidad' }))).toEqual(['suspender_comunidad', 'cerrar', 'suspender', 'descartar'])
    expect(accionesDenuncia(d({ tipo: 'comunidad', vigente: false }))).toEqual(['suspender', 'descartar'])
    expect(accionesDenuncia(d({ tipo: 'perfil', autor: null, vigente: false }))).toEqual(['descartar'])
  })
  it('nombra los motivos', () => {
    expect(textoMotivos({ motivos: ['acoso', 'spam'] })).toBe('Acoso o insultos · Spam')
  })
})

describe('leerSuspendidos', () => {
  it('con y sin perfil', () => {
    expect(leerSuspendidos([{ alias: 'beto', nombre: null, desde: '2026-10-19T10:00:00Z', con_perfil: false }, { alias: 'ana', nombre: 'Ana', desde: null, con_perfil: true }, { nombre: 'x' }]))
      .toEqual([{ alias: 'beto', nombre: null, desde: Date.parse('2026-10-19T10:00:00Z'), conPerfil: false }, { alias: 'ana', nombre: 'Ana', desde: null, conPerfil: true }])
  })
})

describe('leerComunidadesSuspendidas', () => {
  it('id y nombre; lo demás se descarta', () => {
    expect(leerComunidadesSuspendidas([{ id: 'g1', nombre: 'Running' }, { id: 'g2' }, null])).toEqual([{ id: 'g1', nombre: 'Running' }])
    expect(leerComunidadesSuspendidas(null)).toEqual([])
  })
})
