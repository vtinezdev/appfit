import { conseguido, GRUPOS_LOGRO, IDS_LOGRO, type GrupoLogro, type IdLogro, type Logro } from '../../vitrina/lib/logros'
import type { ResumenLogro } from './publicacion'

/**
 * Avatar de catálogo de Social (0015): una disciplina sobre un tono, un paisaje o un logro de la Vitrina. El servidor guarda
 * solo su identificador (`disciplina.pesas.bosque`, `paisaje.cumbre`, `logro.cumbres.cumbres`); no hay imágenes. Un
 * identificador que esta versión no conoce se pinta como el monograma.
 */
export type Avatar =
  | { tipo: 'disciplina'; disciplina: DisciplinaAvatar; tono: TonoAvatar }
  | { tipo: 'paisaje'; paisaje: PaisajeAvatar }
  | { tipo: 'logro'; logro: IdLogro; grupo: GrupoLogro }

export const DISCIPLINAS_AVATAR = [
  { id: 'pesas', nombre: 'Pesas' },
  { id: 'kettlebell', nombre: 'Kettlebell' },
  { id: 'carrera', nombre: 'Carrera' },
  { id: 'caminar', nombre: 'Caminar' },
  { id: 'montana', nombre: 'Montaña' },
  { id: 'bici', nombre: 'Bici' },
  { id: 'natacion', nombre: 'Natación' },
  { id: 'padel', nombre: 'Pádel' },
  { id: 'futbol', nombre: 'Fútbol' },
  { id: 'ruta', nombre: 'Ruta' },
] as const
export type DisciplinaAvatar = (typeof DISCIPLINAS_AVATAR)[number]['id']

/** Fondos de una disciplina: la paleta fija de la Vitrina. El trazo es marfil salvo sobre oro (bosque). */
export const TONOS_AVATAR = [
  { id: 'bosque', nombre: 'Bosque' },
  { id: 'arcilla', nombre: 'Arcilla' },
  { id: 'salvia', nombre: 'Salvia' },
  { id: 'cobalto', nombre: 'Cobalto' },
  { id: 'magenta', nombre: 'Magenta' },
  { id: 'oro', nombre: 'Oro' },
] as const
export type TonoAvatar = (typeof TONOS_AVATAR)[number]['id']
export const TONO_INICIAL: TonoAvatar = 'bosque'

/** Cada paisaje se desbloquea con el primer nivel de un logro de la Vitrina. */
export const PAISAJES_AVATAR = [
  { id: 'cumbre', nombre: 'Cumbre', logro: 'cumbres' },
  { id: 'volcan', nombre: 'Volcán', logro: 'metros' },
  { id: 'noche', nombre: 'Noche', logro: 'semanas' },
  { id: 'pista', nombre: 'Pista', logro: 'km-corriendo' },
  { id: 'bosque', nombre: 'Bosque', logro: 'salidas' },
  { id: 'lago', nombre: 'Lago', logro: 'rutas' },
  { id: 'dunas', nombre: 'Dunas', logro: 'pasos' },
  { id: 'mar', nombre: 'Mar', logro: 'distancia' },
] as const satisfies readonly { id: string; nombre: string; logro: IdLogro }[]
export type PaisajeAvatar = (typeof PAISAJES_AVATAR)[number]['id']

const MAX_ID = 64
const DISCIPLINAS = new Set<string>(DISCIPLINAS_AVATAR.map(d => d.id))
const TONOS = new Set<string>(TONOS_AVATAR.map(t => t.id))
const PAISAJES = new Set<string>(PAISAJES_AVATAR.map(p => p.id))
const LOGROS = new Set<string>(IDS_LOGRO)

/** El identificador que guarda el servidor. */
export function idAvatar(a: Avatar): string {
  if (a.tipo === 'disciplina') return `disciplina.${a.disciplina}.${a.tono}`
  if (a.tipo === 'paisaje') return `paisaje.${a.paisaje}`
  return `logro.${a.grupo}.${a.logro}`
}

/** Lee un identificador del servidor; lo que no se reconozca (versiones futuras, basura) es `null`: monograma. */
export function leerAvatar(x: unknown): Avatar | null {
  if (typeof x !== 'string' || x.length > MAX_ID) return null
  const [tipo, a, b, ...resto] = x.split('.')
  if (resto.length) return null
  if (tipo === 'disciplina' && DISCIPLINAS.has(a) && b !== undefined && TONOS.has(b)) return { tipo, disciplina: a as DisciplinaAvatar, tono: b as TonoAvatar }
  if (tipo === 'paisaje' && PAISAJES.has(a) && b === undefined) return { tipo, paisaje: a as PaisajeAvatar }
  if (tipo === 'logro' && Object.hasOwn(GRUPOS_LOGRO, a) && b !== undefined && LOGROS.has(b)) return { tipo, logro: b as IdLogro, grupo: a as GrupoLogro }
  return null
}

/** El avatar de antes (0012/0014): la publicación de un logro. Se pinta igual que un logro de catálogo. */
export function avatarDeResumen(r: ResumenLogro): Avatar {
  return { tipo: 'logro', logro: r.logroId, grupo: r.grupo }
}

export const mismoAvatar = (a: Avatar | null, b: Avatar | null) => (a ? idAvatar(a) : null) === (b ? idAvatar(b) : null)

/** Lo que se lee en «Avatar» del editor y en la hoja: «Paisaje · Cumbre». */
export function nombreAvatar(a: Avatar | null, logros: readonly Pick<Logro, 'id' | 'nombre'>[] = []): string {
  if (!a) return 'Tus iniciales'
  if (a.tipo === 'disciplina') return `${DISCIPLINAS_AVATAR.find(d => d.id === a.disciplina)!.nombre} · ${TONOS_AVATAR.find(t => t.id === a.tono)!.nombre}`
  if (a.tipo === 'paisaje') return `Paisaje · ${PAISAJES_AVATAR.find(p => p.id === a.paisaje)!.nombre}`
  return `Logro · ${logros.find(l => l.id === a.logro)?.nombre ?? GRUPOS_LOGRO[a.grupo]}`
}

export interface EstadoPaisaje { id: PaisajeAvatar; nombre: string; desbloqueado: boolean; requisito: string }

/** Qué paisajes tiene desbloqueados la persona y qué pide cada uno (el primer nivel de su logro), según su Vitrina. */
export function estadoPaisajes(logros: readonly Logro[]): EstadoPaisaje[] {
  return PAISAJES_AVATAR.map(p => {
    const l = logros.find(x => x.id === p.logro)
    const umbral = l?.umbrales?.[0]
    const pide = l ? (umbral !== undefined && l.textoNivel ? l.textoNivel(umbral) : l.descripcion) : null
    return { id: p.id, nombre: p.nombre, desbloqueado: !!l && conseguido(l), requisito: pide ?? 'Se desbloquea con un logro de la Vitrina' }
  })
}

/** Los logros de la Vitrina por sección, en su orden, para la pestaña Logros de la hoja. */
export function logrosPorGrupo(logros: readonly Logro[]): { grupo: GrupoLogro; nombre: string; logros: Logro[] }[] {
  return (Object.keys(GRUPOS_LOGRO) as GrupoLogro[])
    .map(grupo => ({ grupo, nombre: GRUPOS_LOGRO[grupo], logros: logros.filter(l => l.grupo === grupo) }))
    .filter(g => g.logros.length > 0)
}

/**
 * ¿Puede elegirlo? Disciplinas siempre; paisajes y logros, si la Vitrina los da por conseguidos. Si no hay Vitrina
 * (desactivada), solo disciplinas.
 */
export function avatarDisponible(a: Avatar, logros: readonly Logro[]): boolean {
  if (a.tipo === 'disciplina') return true
  if (a.tipo === 'paisaje') return estadoPaisajes(logros).some(p => p.id === a.paisaje && p.desbloqueado)
  const l = logros.find(x => x.id === a.logro)
  return !!l && conseguido(l)
}
