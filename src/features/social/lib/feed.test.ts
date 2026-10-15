import { describe, expect, it } from 'vitest'
import { leerAvisos, leerComentario, leerPublicacion, resumenAvisos, textoAviso, validarComentario } from './feed'
import { resumenActividad } from './publicacion'
import { textoComentarios, textoReacciones } from './reaccion'

const resumen = resumenActividad({ tipo: 'correr', titulo: 'Carrera', duracionSeg: 1800, distanciaM: 5000 })
const fila = {
  id: 'p1', alias: 'ana', nombre: null, fecha: '2026-10-15T07:00:00+00:00', creada: '2026-10-15T09:00:00.123+00:00',
  resumen, reacciones: 3, comentarios: 1, reaccione: true, mia: false,
}

describe('leer el feed', () => {
  it('lee una fila del servidor', () => {
    expect(leerPublicacion(fila)).toEqual({ ...fila, fecha: Date.UTC(2026, 9, 15, 7), resumen })
  })

  it('descarta filas que no se pueden pintar', () => {
    expect(leerPublicacion({ ...fila, resumen: { v: 9 } })).toBeNull()
    expect(leerPublicacion({ ...fila, fecha: 'ayer' })).toBeNull()
    expect(leerPublicacion({ ...fila, alias: '' })).toBeNull()
    expect(leerPublicacion(null)).toBeNull()
  })

  it('recuentos raros cuentan como cero', () => {
    expect(leerPublicacion({ ...fila, reacciones: -2, comentarios: 'x', reaccione: 'si' })).toMatchObject({ reacciones: 0, comentarios: 0, reaccione: false })
  })

  it('lee un comentario', () => {
    expect(leerComentario({ id: 'c1', alias: 'beto', nombre: 'Beto', texto: '¡Bien!', creado: '2026-10-15T09:00:00Z', mio: false, puedo_borrar: true }))
      .toEqual({ id: 'c1', alias: 'beto', nombre: 'Beto', texto: '¡Bien!', creado: Date.UTC(2026, 9, 15, 9), mio: false, puedoBorrar: true })
    expect(leerComentario({ id: 'c1', alias: 'beto', texto: '', creado: '2026-10-15T09:00:00Z' })).toBeNull()
  })
})

describe('avisos', () => {
  it('lee la lista y descarta lo raro', () => {
    const a = leerAvisos({
      solicitudes: 1, nuevos: 2,
      lista: [
        { tipo: 'comentario', alias: 'beto', nombre: null, publicacion: 'p1', titulo: 'Torso A', texto: 'Bien', creado: '2026-10-15T09:00:00Z', nuevo: true },
        { tipo: 'reaccion', alias: 'ana', nombre: 'Ana', publicacion: 'p1', titulo: null, texto: null, creado: '2026-10-15T08:00:00Z', nuevo: false },
        { tipo: 'otro', alias: 'x', publicacion: 'p1', creado: '2026-10-15T08:00:00Z' },
      ],
    })
    expect(a.solicitudes).toBe(1)
    expect(a.lista.map((x) => [x.tipo, x.titulo])).toEqual([['comentario', 'Torso A'], ['reaccion', 'tu publicación']])
    expect(leerAvisos('nada')).toEqual({ solicitudes: 0, nuevos: 0, lista: [] })
  })

  it('textos', () => {
    const [comentario, reaccion] = leerAvisos({ lista: [
      { tipo: 'comentario', alias: 'b', publicacion: 'p', titulo: 'Torso A', creado: '2026-10-15T09:00:00Z' },
      { tipo: 'reaccion', alias: 'a', publicacion: 'p', titulo: 'Torso A', creado: '2026-10-15T09:00:00Z' },
    ] }).lista
    expect(textoAviso(comentario)).toBe('Comentó en Torso A')
    expect(textoAviso(reaccion)).toBe('Te dio ánimo en Torso A')
    expect(resumenAvisos({ solicitudes: 0, nuevos: 0 })).toBeNull()
    expect(resumenAvisos({ solicitudes: 1, nuevos: 3 })).toBe('1 solicitud · 3 novedades')
    expect(resumenAvisos({ solicitudes: 2, nuevos: 1 })).toBe('2 solicitudes · 1 novedad')
  })
})

describe('textos de la reacción y los comentarios', () => {
  it('singular y plural', () => {
    expect(textoReacciones(1)).toBe('1 ánimo')
    expect(textoReacciones(1200)).toBe('1.200 ánimos')
    expect(textoComentarios(0)).toBe('0 comentarios')
    expect(textoComentarios(1)).toBe('1 comentario')
  })
})

describe('validarComentario', () => {
  it('ni vacío ni largo', () => {
    expect(validarComentario('   ')).toMatch(/Escribe/)
    expect(validarComentario('a'.repeat(501))).toMatch(/500/)
    expect(validarComentario(' Bien ')).toBeNull()
  })
})
