import { describe, expect, it } from 'vitest'
import { contextoPublicacion, leerAvatares, leerUltimosComentarios, leerPaginaComentarios, leerPaginaPublicaciones, leerAvisos, leerComentario, leerPublicacion, resumenAvisos, textoAviso, validarComentario } from './feed'
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
    expect(leerPublicacion({ ...fila, creada: 'ayer' })).toBeNull()
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
    expect(leerAvisos('nada')).toEqual({ solicitudes: 0, nuevos: 0, invitaciones: 0, lista: [] })
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

  it('añadido a una comunidad: el id viaja en `publicacion` y se lee como comunidad', () => {
    const [anadido] = leerAvisos({ lista: [
      { tipo: 'anadido', alias: 'tinez', nombre: 'Tinez', publicacion: 'g1', titulo: 'Fuerza', creado: '2026-10-19T09:00:00Z', nuevo: true },
      { tipo: 'anadido', alias: 'tinez', publicacion: null, titulo: 'Sin id', creado: '2026-10-19T09:00:00Z' },
    ] }).lista
    expect(anadido).toMatchObject({ tipo: 'anadido', alias: 'tinez', publicacion: '', comunidad: 'g1', titulo: 'Fuerza', nuevo: true })
    expect(textoAviso(anadido)).toBe('Te añadió a la comunidad Fuerza')
  })

  it('semana en compañía: las invitaciones cuentan aparte y el ánimo lleva el id del grupo (0025)', () => {
    const a = leerAvisos({ solicitudes: 0, nuevos: 1, companias: 2, lista: [
      { tipo: 'animo_compania', alias: 'jon', nombre: 'Jon', publicacion: 'g1', titulo: '', creado: '2026-10-23T09:00:00Z', nuevo: true, personas: 2 },
      { tipo: 'animo_compania', alias: 'jon', publicacion: null, creado: '2026-10-23T09:00:00Z' },
    ] })
    expect(a.invitaciones).toBe(2)
    expect(a.lista).toHaveLength(1)
    expect(a.lista[0]).toMatchObject({ tipo: 'animo_compania', publicacion: '', compania: 'g1', personas: 2 })
    expect(textoAviso(a.lista[0])).toBe('Ánimo en tu semana en compañía')
    expect(resumenAvisos({ solicitudes: 0, nuevos: 0, invitaciones: 1 })).toBe('1 invitación')
    expect(resumenAvisos({ solicitudes: 1, nuevos: 2, invitaciones: 2 })).toBe('1 solicitud · 2 invitaciones · 2 novedades')
    expect(leerAvisos({ solicitudes: 1, nuevos: 0, lista: [] }).invitaciones).toBe(0)
  })

  it('denuncia en la que se actuó: sin persona ni objetivo (0026)', () => {
    const [d] = leerAvisos({ lista: [{ tipo: 'denuncia', alias: null, publicacion: null, creado: '2026-10-23T09:00:00Z', nuevo: true }, { tipo: 'denuncia', creado: 'x' }] }).lista
    expect(d).toMatchObject({ tipo: 'denuncia', alias: '', publicacion: '', nuevo: true })
    expect(textoAviso(d)).toBe('Revisamos tu denuncia y hemos actuado. Gracias por avisar.')
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

// El cursor pertenece al transporte: no depende de lo que esta versión sepa representar.
describe('páginas sociales', () => {
  it('conserva la última fila cruda aunque sea de una versión desconocida', () => {
    const filas = Array.from({ length: 20 }, (_, i) => ({ ...fila, id: `p${i}`, creada: '2026-10-15T09:00:00.123456+00:00', ...(i === 19 ? { resumen: { v: 2 } } : {}) }))
    const pagina = leerPaginaPublicaciones(filas)
    expect(pagina.items).toHaveLength(19)
    expect(pagina.hayMas).toBe(true)
    expect(pagina.cursor).toEqual({ fecha: filas[19].creada, id: 'p19' })
    expect(pagina.descartadas).toBe(1)
  })
  it('una página totalmente desconocida sigue teniendo continuación', () => {
    const pagina = leerPaginaPublicaciones(Array.from({ length: 20 }, (_, i) => ({ ...fila, id: `p${i}`, resumen: { v: 9 } })))
    expect(pagina.items).toEqual([])
    expect(pagina.hayMas).toBe(true)
    expect(pagina.cursor?.id).toBe('p19')
    expect(leerPaginaPublicaciones([])).toMatchObject({ hayMas: false, cursor: null })
  })
  it('un cursor corrupto produce un error recuperable', () => {
    expect(() => leerPaginaPublicaciones([{ ...fila, creada: 'ayer' }])).toThrow('continuar')
  })
  it('el total de comentarios no es el tamaño de página', () => {
    const pagina = leerPaginaComentarios({ total: 250, items: [{ id: 'c1', alias: 'ana', texto: 'Bien', creado: fila.creada }] })
    expect(pagina.total).toBe(250)
    expect(pagina.items).toHaveLength(1)
    expect(() => leerPaginaComentarios([])).toThrow()
  })
  it('la fecha de entreno solo aparece si es de otro día', () => {
    expect(contextoPublicacion('entreno', Date.parse(fila.creada), fila.creada)).toBeNull()
    expect(contextoPublicacion('texto', 0, fila.creada)).toBeNull()
    expect(contextoPublicacion('entreno', Date.parse('2026-10-01T12:00:00Z'), fila.creada)).toContain('1 de octubre')
  })
})

describe('lecturas del rediseño (0014)', () => {
  it('vista previa del último comentario: descarta lo que no se puede pintar', () => {
    expect(leerUltimosComentarios({ p1: { alias: 'beto', nombre: null, texto: '¡Bien!' }, p2: { alias: '', texto: 'x' }, p3: 'raro' }))
      .toEqual({ p1: { alias: 'beto', nombre: null, texto: '¡Bien!' } })
    expect(leerUltimosComentarios(null)).toEqual({})
  })
  it('avatares: logros publicados de antes (0014) y catálogo (0015); lo demás, monograma', () => {
    const logro = { v: 1, tipo: 'logro', titulo: 'Entrenos', logroId: 'entrenos', grupo: 'entreno', nivel: 1, descripcion: '10 entrenos' }
    expect(leerAvatares({
      ana: logro, beto: resumen, carla: { ...logro, logroId: 'inventado' },
      dani: 'paisaje.cumbre', eva: 'disciplina.bici.oro', fran: 'paisaje.inventado', gema: 'logro.oculto.noctambulo',
    })).toEqual({
      ana: { tipo: 'logro', logro: 'entrenos', grupo: 'entreno' },
      dani: { tipo: 'paisaje', paisaje: 'cumbre' },
      eva: { tipo: 'disciplina', disciplina: 'bici', tono: 'oro' },
      gema: { tipo: 'logro', logro: 'noctambulo', grupo: 'oculto' },
    })
    expect(leerAvatares([])).toEqual({})
  })
})
