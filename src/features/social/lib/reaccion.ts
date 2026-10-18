import { formatInt } from '../../../shared/lib/format'

/**
 * Nombre de la reacción de Amigos (lo que en Strava son los kudos). Es provisional (ADR 040): cambiarlo es cambiar
 * solo esto; el servidor la llama `reacciones`.
 */
export const REACCION = {
  visible: 'Ánimo',
  activo: 'Animado',
  singular: 'ánimo',
  plural: 'ánimos',
  dar: 'Dar ánimo',
  quitar: 'Quitar tu ánimo',
  /** «Ana te dio ánimo». */
  aviso: 'te dio ánimo',
} as const

/** «1 ánimo», «3 ánimos». */
export function textoReacciones(n: number): string {
  return `${formatInt(n)} ${n === 1 ? REACCION.singular : REACCION.plural}`
}

/** «1 comentario», «3 comentarios». */
export function textoComentarios(n: number): string {
  return `${formatInt(n)} ${n === 1 ? 'comentario' : 'comentarios'}`
}
