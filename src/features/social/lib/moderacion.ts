import { MOTIVOS_DENUNCIA, type MotivoDenuncia } from '../data/social'
import { leerResumen, type Resumen } from './publicacion'

/**
 * El panel de Moderación del administrador (0017): las denuncias pendientes, agrupadas por lo denunciado, y los perfiles
 * suspendidos, tal como llegan de `admin_denuncias` y `admin_suspendidos`, y qué se puede hacer con cada una.
 */

export type TipoDenuncia = 'perfil' | 'publicacion' | 'comentario' | 'comunidad'
/** `suspender_comunidad` y `cerrar`: solo con una comunidad que sigue existiendo (0026). */
export type AccionDenuncia = 'borrar' | 'suspender' | 'suspender_comunidad' | 'cerrar' | 'descartar'

export interface Denuncia {
  /** La última denuncia de lo mismo: resolverla resuelve todas. */
  id: number
  tipo: TipoDenuncia
  /** ms de la más reciente. */
  creada: number
  /** Cuántas personas lo han denunciado (sin revisar). */
  denuncias: number
  motivos: MotivoDenuncia[]
  detalles: string[]
  /** Cómo era al denunciarlo (texto guardado por el servidor). */
  contenido: string
  /** Alias del autor (perfil denunciado, autor del contenido o creador de la comunidad), si sigue teniendo perfil. */
  autor: string | null
  autorSuspendido: boolean
  /** Si lo denunciado sigue existiendo. */
  vigente: boolean
  /** La publicación tal como está ahora, si sigue existiendo. */
  resumen: Resumen | null
  /** El comentario tal como está ahora. */
  texto: string | null
}

export interface Suspendido {
  alias: string
  nombre: string | null
  /** ms; `null` si se suspendió a mano en el SQL Editor. */
  desde: number | null
  /** Falso si borró su perfil estando suspendido: la suspensión sigue y no puede crear otro. */
  conPerfil: boolean
}

const TIPOS: TipoDenuncia[] = ['perfil', 'publicacion', 'comentario', 'comunidad']
const MOTIVOS = MOTIVOS_DENUNCIA.map(m => m.valor)

const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const texto = (x: unknown): string | null => (typeof x === 'string' && x.trim() !== '' ? x : null)
const ms = (x: unknown): number | null => {
  const t = typeof x === 'string' ? Date.parse(x) : Number.NaN
  return Number.isFinite(t) ? t : null
}

export function leerDenuncias(x: unknown): Denuncia[] {
  if (!Array.isArray(x)) return []
  return x.flatMap((d): Denuncia[] => {
    if (!esObjeto(d) || !TIPOS.includes(d.tipo as TipoDenuncia)) return []
    const creada = ms(d.creada)
    if (typeof d.id !== 'number' || !Number.isSafeInteger(d.id) || creada === null) return []
    return [{
      id: d.id, tipo: d.tipo as TipoDenuncia, creada,
      denuncias: typeof d.denuncias === 'number' && d.denuncias > 0 ? Math.round(d.denuncias) : 1,
      motivos: (Array.isArray(d.motivos) ? d.motivos : []).filter((m): m is MotivoDenuncia => MOTIVOS.includes(m as MotivoDenuncia)),
      detalles: (Array.isArray(d.detalles) ? d.detalles : []).map(texto).filter((t): t is string => t !== null),
      contenido: texto(d.contenido) ?? '',
      autor: texto(d.autor), autorSuspendido: d.autorSuspendido === true, vigente: d.vigente === true,
      resumen: d.tipo === 'publicacion' ? leerResumen(d.resumen) : null,
      texto: d.tipo === 'comentario' ? texto(d.texto) : null,
    }]
  })
}

export function leerSuspendidos(x: unknown): Suspendido[] {
  if (!Array.isArray(x)) return []
  return x.flatMap((s): Suspendido[] => {
    const alias = esObjeto(s) ? texto(s.alias) : null
    if (!esObjeto(s) || !alias) return []
    return [{ alias, nombre: texto(s.nombre), desde: ms(s.desde), conPerfil: s.con_perfil !== false }]
  })
}

const ETIQUETA: Record<TipoDenuncia, string> = { perfil: 'Perfil', publicacion: 'Publicación', comentario: 'Comentario', comunidad: 'Comunidad' }

/** Lo guardado al denunciar va como «alias · resto»; el resto, sin el alias. */
function trasAlias(contenido: string): string {
  const i = contenido.indexOf(' · ')
  return i < 0 ? contenido : contenido.slice(i + 3)
}

function resumenGuardado(contenido: string): Resumen | null {
  try { return leerResumen(JSON.parse(trasAlias(contenido))) } catch { return null }
}

/**
 * Qué es y de quién («Publicación de @beto»), su título (si lo tiene) y el texto que se denunció, con lo actual si sigue
 * existiendo.
 */
export function describirDenuncia(d: Denuncia): { etiqueta: string; titulo: string | null; texto: string | null } {
  const etiqueta = `${ETIQUETA[d.tipo]}${d.autor && d.tipo !== 'perfil' ? ` de @${d.autor}` : ''}`
  switch (d.tipo) {
    case 'perfil':
      return { etiqueta, titulo: d.autor ? `@${d.autor}` : d.contenido.split(' · ')[0] || null, texto: texto(trasAlias(d.contenido)) }
    case 'publicacion': {
      const r = d.resumen ?? resumenGuardado(d.contenido)
      if (!r) return { etiqueta, titulo: null, texto: texto(trasAlias(d.contenido)) }
      return { etiqueta, titulo: r.titulo, texto: r.tipo === 'texto' ? r.texto : r.nota ?? null }
    }
    case 'comentario':
      return { etiqueta, titulo: null, texto: d.texto ?? texto(trasAlias(d.contenido)) }
    default: {
      const [nombre, ...resto] = d.contenido.split(' · ')
      return { etiqueta, titulo: nombre || null, texto: texto(resto.join(' · ')) }
    }
  }
}

/** Los motivos con su nombre, separados por « · ». */
export function textoMotivos(d: Pick<Denuncia, 'motivos'>): string {
  return d.motivos.map(m => MOTIVOS_DENUNCIA.find(v => v.valor === m)?.label ?? m).join(' · ')
}

/**
 * Lo que se puede hacer: borrar lo que sigue existiendo (publicación o comentario), suspender o cerrar una comunidad que
 * sigue existiendo (0026), suspender a su autor si tiene perfil activo y descartar siempre.
 */
export function accionesDenuncia(d: Denuncia): AccionDenuncia[] {
  const acciones: AccionDenuncia[] = []
  if (d.vigente && (d.tipo === 'publicacion' || d.tipo === 'comentario')) acciones.push('borrar')
  if (d.vigente && d.tipo === 'comunidad') acciones.push('suspender_comunidad', 'cerrar')
  if (d.autor && !d.autorSuspendido) acciones.push('suspender')
  acciones.push('descartar')
  return acciones
}

export interface ComunidadSuspendida { id: string; nombre: string }

/** Las comunidades suspendidas (0026), para reactivarlas; sin 0026, ninguna. */
export function leerComunidadesSuspendidas(x: unknown): ComunidadSuspendida[] {
  if (!Array.isArray(x)) return []
  return x.flatMap(c => esObjeto(c) && texto(c.id) && texto(c.nombre) ? [{ id: c.id as string, nombre: c.nombre as string }] : [])
}
