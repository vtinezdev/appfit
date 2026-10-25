// Semana en compañía (ADR 057): grupos de 2 o 3 personas que se siguen mutuamente y se acompañan semana tras semana,
// cada una contra su propio plan de Ritmo. Lo único que sale del móvil es el agregado de la semana (`SemanaCompanero`),
// calculado aquí desde Ritmo (solo lectura), y solo mientras la persona está en algún grupo.
import type { ResultadoRitmo } from '../../ritmo/lib/ritmo'
import type { Persona } from './relacion'

/** Personas por grupo, contigo. */
export const MAX_COMPANEROS = 3

export type EstadoCompanero = 'invitado' | 'activo' | 'pausa'

/** La semana de alguien: su lunes (en su hora local), entrenos que cuentan y entrenos de su plan de Ritmo. */
export interface SemanaCompanero { lunes: string; hechas: number; objetivo: number }

export interface Companero {
  alias: string
  nombre: string | null
  yo: boolean
  estado: EstadoCompanero
  /** Solo de quien está activo; `null` si aún no subió ninguna. */
  semana: SemanaCompanero | null
}

export interface AnimoCompania { de: string; para: string; lunes: string }

export interface Compania { id: string; miembros: Companero[]; animos: AnimoCompania[] }

export interface InvitacionCompania {
  id: string
  /** Alias de quien invita (`null` si ya no tiene perfil). */
  de: string | null
  /** Quienes ya están dentro (sin ti). */
  miembros: { alias: string; nombre: string | null }[]
}

export interface Companias { grupos: Compania[]; invitaciones: InvitacionCompania[] }

const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const esTexto = (x: unknown): x is string => typeof x === 'string' && x.length > 0
const esLunes = (x: unknown): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x)
const esCifra = (x: unknown): x is number => Number.isInteger(x) && (x as number) >= 0 && (x as number) <= 7
const nombre = (x: unknown): string | null => typeof x === 'string' && x ? x : null

function leerSemana(x: unknown): SemanaCompanero | null {
  if (!esObjeto(x) || !esLunes(x.lunes) || !esCifra(x.hechas) || !esCifra(x.objetivo)) return null
  return { lunes: x.lunes, hechas: x.hechas, objetivo: x.objetivo }
}

function leerCompanero(x: unknown): Companero | null {
  if (!esObjeto(x) || !esTexto(x.alias) || (x.estado !== 'invitado' && x.estado !== 'activo' && x.estado !== 'pausa')) return null
  return { alias: x.alias, nombre: nombre(x.nombre), yo: x.yo === true, estado: x.estado, semana: x.estado === 'activo' ? leerSemana(x.semana) : null }
}

function lista<T>(x: unknown, leer: (y: unknown) => T | null): T[] {
  return Array.isArray(x) ? x.map(leer).filter((y): y is T => y !== null) : []
}

/** Lo que devuelve `companias()` (0024). Lo mal formado se descarta: un grupo sin ti, sin id o sin nadie más. */
export function leerCompanias(x: unknown): Companias {
  if (!esObjeto(x)) return { grupos: [], invitaciones: [] }
  const grupos = lista(x.grupos, g => {
    if (!esObjeto(g) || !esTexto(g.id)) return null
    const miembros = lista(g.miembros, leerCompanero)
    if (!miembros.some(m => m.yo) || miembros.length < 2) return null
    const animos = lista(g.animos, a => esObjeto(a) && esTexto(a.de) && esTexto(a.para) && esLunes(a.lunes) ? { de: a.de, para: a.para, lunes: a.lunes } : null)
    return { id: g.id, miembros, animos }
  })
  const invitaciones = lista(x.invitaciones, i => {
    if (!esObjeto(i) || !esTexto(i.id)) return null
    const miembros = lista(i.miembros, m => esObjeto(m) && esTexto(m.alias) ? { alias: m.alias, nombre: nombre(m.nombre) } : null)
    return miembros.length ? { id: i.id, de: esTexto(i.de) ? i.de : null, miembros } : null
  })
  return { grupos, invitaciones }
}

/** Tu semana para el grupo, de Ritmo: entrenos que cuentan frente a los de tu plan. `null` sin Ritmo (gamificación oculta). */
export function semanaPropia(ritmo: Pick<ResultadoRitmo, 'actual'> | null): SemanaCompanero | null {
  if (!ritmo) return null
  const { lunes, entrenos, plan } = ritmo.actual
  return { lunes, hechas: Math.min(entrenos, 7), objetivo: Math.min(plan.entrenos, 7) }
}

/** Si hay que subir tu semana: estás activo en algún grupo y lo del servidor no es lo de tu móvil. */
export function hayQueSubir(c: Companias, local: SemanaCompanero | null): boolean {
  if (!local) return false
  const mias = c.grupos.flatMap(g => g.miembros.filter(m => m.yo && m.estado === 'activo'))
  if (!mias.length) return false
  return mias.some(m => !m.semana || m.semana.lunes !== local.lunes || m.semana.hechas !== local.hechas || m.semana.objetivo !== local.objetivo)
}

export type Situacion =
  | { tipo: 'invitado' | 'pausa' | 'sinDatos' | 'sinPlan' }
  | { tipo: 'progreso' | 'cumplida'; hechas: number; objetivo: number }

/**
 * Cómo va alguien esta semana. Su semana solo cuenta si es la tuya (`lunes`); una anterior es «sin datos». Sin entrenos
 * en el plan, estado neutro: sin cifras ni porcentaje. Entrenar de más no da nada extra: 4 de 3 es «cumplida».
 */
export function situacion(m: Pick<Companero, 'estado' | 'semana'>, lunes: string): Situacion {
  if (m.estado === 'invitado' || m.estado === 'pausa') return { tipo: m.estado }
  const s = m.semana
  if (!s || s.lunes !== lunes) return { tipo: 'sinDatos' }
  if (s.objetivo === 0) return { tipo: 'sinPlan' }
  return { tipo: s.hechas >= s.objetivo ? 'cumplida' : 'progreso', hechas: s.hechas, objetivo: s.objetivo }
}

/** «2 de 3», «Semana cumplida», «En pausa»… */
export function textoSituacion(s: Situacion): string {
  switch (s.tipo) {
    case 'invitado': return 'Invitación enviada'
    case 'pausa': return 'En pausa'
    case 'sinDatos': return 'Sin datos esta semana'
    case 'sinPlan': return 'Sin entrenos en su plan'
    case 'cumplida': return 'Semana cumplida'
    case 'progreso': return `${s.hechas} de ${s.objetivo}`
  }
}

/** Alias de quienes te han dado ánimo esta semana en el grupo, en orden. */
export function animosRecibidos(g: Compania, lunes: string): string[] {
  const yo = g.miembros.find(m => m.yo)?.alias
  const dentro = new Set(g.miembros.filter(m => !m.yo && m.estado !== 'invitado').map(m => m.alias))
  return g.animos.filter(a => a.para === yo && a.lunes === lunes && dentro.has(a.de)).map(a => a.de)
}

/** Si ya le diste ánimo a `alias` esta semana. */
export function heAnimado(g: Compania, alias: string, lunes: string): boolean {
  const yo = g.miembros.find(m => m.yo)?.alias
  return g.animos.some(a => a.de === yo && a.para === alias && a.lunes === lunes)
}

/** Da o quita tu ánimo a `alias` en la copia local (para pintarlo al momento, antes de releer). */
export function conAnimo(g: Compania, alias: string, lunes: string, dar: boolean): Compania {
  const yo = g.miembros.find(m => m.yo)?.alias
  if (!yo) return g
  const sin = g.animos.filter(a => !(a.de === yo && a.para === alias && a.lunes === lunes))
  return { ...g, animos: dar ? [...sin, { de: yo, para: alias, lunes }] : sin }
}

/** A quién puedes invitar: personas que os seguís mutuamente y que no están ya en el grupo. */
export function candidatos(personas: Persona[], g?: Compania): Persona[] {
  const dentro = new Set(g?.miembros.map(m => m.alias) ?? [])
  return personas.filter(p => p.sigo === 'aceptado' && p.meSigue === 'aceptado' && !dentro.has(p.alias))
}

/** Cuántas personas más caben en el grupo (con uno nuevo, contigo: 2). */
export function plazasLibres(g?: Compania): number {
  return MAX_COMPANEROS - (g ? g.miembros.length : 1)
}
