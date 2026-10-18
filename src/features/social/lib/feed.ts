import { formatInt } from '../../../shared/lib/format'
import { leerResumen, type Resumen } from './publicacion'
import { REACCION } from './reaccion'

/**
 * El feed, los comentarios y los avisos tal como los pinta la app (fase 5 de docs/social.md). Lo que llega del
 * servidor se valida aquí: una fila rara se descarta en lugar de romper la pantalla.
 */

export const POR_PAGINA = 20
export const COMENTARIO_MAX = 500

/** Conserva la precisión del timestamp del servidor; no convertirlo a milisegundos. */
export interface CursorSocial { fecha: string; id: string }
export interface PaginaSocial<T> {
  items: T[]
  cursor: CursorSocial | null
  hayMas: boolean
  descartadas: number
}
export interface PaginaComentarios extends PaginaSocial<Comentario> { total: number }

export interface PublicacionFeed {
  id: string
  alias: string
  nombre: string | null
  /** ms del inicio del entreno o de la actividad. */
  fecha: number
  /** Cuándo se publicó (ISO): el cursor de la página siguiente. */
  creada: string
  resumen: Resumen
  reacciones: number
  comentarios: number
  /** Si yo he reaccionado. */
  reaccione: boolean
  /** Si es mía. */
  mia: boolean
}

export interface Comentario {
  id: string
  alias: string
  nombre: string | null
  texto: string
  /** ms. */
  creado: number
  mio: boolean
  puedoBorrar: boolean
  respuestaA?: string
  respuestaAlias?: string
}

export interface Aviso {
  tipo: 'reaccion' | 'comentario' | 'respuesta' | 'aceptada' | 'comunidad'
  personas?: number
  mia?: boolean
  alias: string
  nombre: string | null
  publicacion: string
  /** Título de la publicación. */
  titulo: string
  /** Los comentarios, su comienzo. */
  texto: string | null
  /** ms. */
  creado: number
  nuevo: boolean
}

export interface Avisos {
  solicitudes: number
  /** Reacciones y comentarios nuevos desde la última vez que se vieron. */
  nuevos: number
  lista: Aviso[]
}

const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const texto = (x: unknown): string | null => (typeof x === 'string' && x.trim() !== '' ? x : null)
const entero = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? Math.round(x) : 0)
const ms = (x: unknown): number | null => {
  const t = typeof x === 'string' ? Date.parse(x) : Number.NaN
  return Number.isFinite(t) ? t : null
}

/** Una fila de `feed`/`publicaciones_de`, o `null` si no se puede pintar. */
export function leerPublicacion(x: unknown): PublicacionFeed | null {
  if (!esObjeto(x)) return null
  const id = texto(x.id)
  const alias = texto(x.alias)
  const creada = texto(x.creada)
  const fecha = ms(x.fecha)
  const resumen = leerResumen(x.resumen)
  if (!id || !alias || !creada || ms(creada) === null || fecha === null || !resumen) return null
  return {
    id, alias, nombre: texto(x.nombre), fecha, creada, resumen,
    reacciones: entero(x.reacciones), comentarios: entero(x.comentarios), reaccione: x.reaccione === true, mia: x.mia === true,
  }
}

export function leerComentario(x: unknown): Comentario | null {
  if (!esObjeto(x)) return null
  const id = texto(x.id)
  const alias = texto(x.alias)
  const t = texto(x.texto)
  const creado = ms(x.creado)
  if (!id || !alias || !t || creado === null) return null
  return { id, alias, nombre: texto(x.nombre), texto: t, creado, mio: x.mio === true, puedoBorrar: x.puedo_borrar === true, ...(texto(x.respuesta_a) && texto(x.respuesta_alias) ? { respuestaA: x.respuesta_a as string, respuestaAlias: x.respuesta_alias as string } : {}) }
}

/** La continuación depende de la página original, incluso si todos sus resúmenes son desconocidos. */
export function leerPaginaSocial<T>(filas: unknown[] | null, leer: (x: unknown) => T | null, campoFecha: 'creada' | 'creado'): PaginaSocial<T> {
  const crudas = filas ?? []
  const items = crudas.map(leer).filter((x): x is T => x !== null)
  const ultima = crudas.at(-1)
  let cursor: CursorSocial | null = null
  if (esObjeto(ultima) && texto(ultima.id) && typeof ultima[campoFecha] === 'string' && ms(ultima[campoFecha]) !== null) {
    cursor = { id: ultima.id as string, fecha: ultima[campoFecha] as string }
  }
  if (crudas.length > 0 && cursor === null) throw new Error('No se ha podido continuar la lista. Inténtalo de nuevo.')
  return { items, cursor, hayMas: crudas.length === POR_PAGINA, descartadas: crudas.length - items.length }
}

export const leerPaginaPublicaciones = (filas: unknown[] | null) => leerPaginaSocial(filas, leerPublicacion, 'creada')

export function leerPaginaComentarios(x: unknown): PaginaComentarios {
  if (!esObjeto(x) || !Array.isArray(x.items) || typeof x.total !== 'number' || !Number.isSafeInteger(x.total) || x.total < 0) {
    throw new Error('No se han podido cargar los comentarios. Inténtalo de nuevo.')
  }
  return { ...leerPaginaSocial(x.items, leerComentario, 'creado'), total: x.total }
}

export function leerAvisos(x: unknown): Avisos {
  if (!esObjeto(x)) return { solicitudes: 0, nuevos: 0, lista: [] }
  const lista = (Array.isArray(x.lista) ? x.lista : []).flatMap((a): Aviso[] => {
    if (!esObjeto(a) || !['reaccion','comentario','respuesta','aceptada','comunidad'].includes(String(a.tipo))) return []
    const alias = texto(a.alias)
    const publicacion = texto(a.publicacion)
    const creado = ms(a.creado)
    if (!alias || (!publicacion && a.tipo !== 'aceptada') || creado === null) return []
    return [{ tipo: a.tipo as Aviso['tipo'], alias, nombre: texto(a.nombre), publicacion: publicacion ?? '', titulo: texto(a.titulo) ?? 'tu publicación', texto: texto(a.texto), creado, nuevo: a.nuevo === true, ...(a.personas !== undefined ? { personas: entero(a.personas) } : {}), ...(typeof a.mia === 'boolean' ? { mia: a.mia } : {}) }]
  })
  return { solicitudes: entero(x.solicitudes), nuevos: entero(x.nuevos), lista }
}

/** «Te dio ánimo en Torso A» o «Comentó en Torso A». */
export function textoAviso(a: Aviso): string {
  if (a.tipo === 'aceptada') return 'Aceptó tu solicitud de seguimiento'
  if (a.tipo === 'respuesta') return `Respondió a tu comentario en ${a.titulo}`
  if (a.tipo === 'comunidad') return `Publicó en ${a.titulo}`
  return a.tipo === 'reaccion' ? `${REACCION.aviso[0].toUpperCase()}${REACCION.aviso.slice(1)} en ${a.titulo}` : `Comentó en ${a.titulo}`
}

/** «2 solicitudes · 3 novedades», o `null` si no hay nada pendiente. */
export function resumenAvisos(a: Pick<Avisos, 'solicitudes' | 'nuevos'>): string | null {
  const partes: string[] = []
  if (a.solicitudes > 0) partes.push(`${formatInt(a.solicitudes)} ${a.solicitudes === 1 ? 'solicitud' : 'solicitudes'}`)
  if (a.nuevos > 0) partes.push(`${formatInt(a.nuevos)} ${a.nuevos === 1 ? 'novedad' : 'novedades'}`)
  return partes.length > 0 ? partes.join(' · ') : null
}

/** Mensaje si el comentario no vale; `null` si vale. */
export function validarComentario(t: string): string | null {
  const limpio = t.trim()
  if (limpio === '') return 'Escribe algo antes de enviarlo.'
  return limpio.length > COMENTARIO_MAX ? `Como mucho ${formatInt(COMENTARIO_MAX)} caracteres.` : null
}

/** La fecha de la sesión solo acompaña a la publicación cuando son días locales diferentes. */
export function contextoPublicacion(tipo: string, fecha: number, creada: string): string | null {
  if (tipo !== 'entreno' && tipo !== 'actividad') return null
  const dia = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  if (dia(new Date(fecha)) === dia(new Date(creada))) return null
  return `${tipo === 'entreno' ? 'Entreno' : 'Actividad'} del ${new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(fecha)}`
}
