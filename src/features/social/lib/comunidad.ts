import { formatInt } from '../../../shared/lib/format'

export const MAX_NOMBRE_COMUNIDAD = 60
export const MAX_DESCRIPCION_COMUNIDAD = 300

export interface Comunidad {
  id: string
  nombre: string
  descripcion: string
  miembros: number
  unida: boolean
  mia: boolean
}

export function validarComunidad(nombre: string, descripcion: string): string | null {
  if (nombre.trim().length < 3 || nombre.trim().length > MAX_NOMBRE_COMUNIDAD) return 'El nombre debe tener entre 3 y 60 caracteres.'
  return descripcion.trim().length > MAX_DESCRIPCION_COMUNIDAD ? `La descripción puede tener como mucho ${formatInt(MAX_DESCRIPCION_COMUNIDAD)} caracteres.` : null
}

export function leerComunidad(x: unknown): Comunidad | null {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return null
  const c = x as Record<string, unknown>
  if (typeof c.id !== 'string' || !c.id || typeof c.nombre !== 'string' || typeof c.descripcion !== 'string') return null
  if (validarComunidad(c.nombre, c.descripcion) || typeof c.miembros !== 'number' || !Number.isSafeInteger(c.miembros) || c.miembros < 0) return null
  return { id: c.id, nombre: c.nombre, descripcion: c.descripcion, miembros: c.miembros, unida: c.unida === true, mia: c.mia === true }
}
