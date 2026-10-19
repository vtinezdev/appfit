import { conseguido, type Logro } from '../../vitrina/lib/logros'
import type { Resumen } from './publicacion'

/** Logros que se pueden destacar a la vez en el perfil deportivo. */
export const MAX_DESTACADOS = 3

interface Pieza { id: string; resumen: Resumen }

/**
 * Logros publicados que se pueden destacar o poner de avatar: los ya destacados, el del avatar y los de tus publicaciones
 * cargadas, en ese orden y sin repetir.
 */
export function logrosElegibles<P extends Pieza>(perfil: { destacados: P[]; avatarId: string | null; avatar: Resumen | null }, publicaciones: P[]): P[] {
  const avatar = perfil.avatarId && perfil.avatar ? [{ id: perfil.avatarId, resumen: perfil.avatar } as P] : []
  const todos = [...perfil.destacados, ...avatar, ...publicaciones.filter(p => p.resumen.tipo === 'logro')]
  return todos.filter((p, i) => todos.findIndex(v => v.id === p.id) === i)
}

/** Marca o desmarca un logro; con los tres ocupados, marcar otro no cambia nada. */
export function alternarDestacado<P extends Pieza>(destacados: P[], pieza: P): P[] {
  if (destacados.some(d => d.id === pieza.id)) return destacados.filter(d => d.id !== pieza.id)
  return destacados.length >= MAX_DESTACADOS ? destacados : [...destacados, pieza]
}

/**
 * Con «Todos»: los logros de Vitrina que todavía no se pueden destacar. Un logro cuenta como compartido si hay alguna
 * publicación suya cargada, de cualquier nivel; los demás se separan en conseguidos sin compartir y sin conseguir.
 */
export function logrosNoElegibles(locales: Logro[], publicados: Pieza[]): { sinCompartir: Logro[]; sinConseguir: Logro[] } {
  const compartidos = new Set(publicados.flatMap(p => p.resumen.tipo === 'logro' ? [p.resumen.logroId] : []))
  const pendientes = locales.filter(l => !compartidos.has(l.id))
  return { sinCompartir: pendientes.filter(conseguido), sinConseguir: pendientes.filter(l => !conseguido(l)) }
}
