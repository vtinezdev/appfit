import { normalizeName } from '../../../shared/lib/text'
import { CATALOGO_IMAGENES_COMUNIDAD } from './catalogoImagenesComunidad'

export { CATALOGO_IMAGENES_COMUNIDAD }
export type OpcionImagenComunidad = (typeof CATALOGO_IMAGENES_COMUNIDAD)[number]
export type ImagenComunidad = OpcionImagenComunidad['id']
export type GrupoImagenComunidad = OpcionImagenComunidad['grupo']

export const GRUPOS_IMAGEN_COMUNIDAD = [
  { id: 'aire-libre', nombre: 'Aire libre' },
  { id: 'entrenamiento', nombre: 'Entrenamiento y movimiento' },
  { id: 'nieve', nombre: 'Nieve' },
  { id: 'equipo', nombre: 'Deportes de equipo' },
  { id: 'raqueta', nombre: 'Raqueta' },
  { id: 'combate', nombre: 'Combate' },
  { id: 'agua', nombre: 'Agua y resistencia' },
] as const satisfies readonly { id: GrupoImagenComunidad; nombre: string }[]

const POR_ID = new Map<string, OpcionImagenComunidad>(CATALOGO_IMAGENES_COMUNIDAD.map(e => [e.id, e]))

/** Solo identificadores propios. Una versión anterior conserva las iniciales para imágenes desconocidas. */
export function leerImagenComunidad(x: unknown): ImagenComunidad | null {
  return typeof x === 'string' ? POR_ID.get(x)?.id ?? null : null
}

export function nombreImagenComunidad(x: unknown): string {
  const id = leerImagenComunidad(x)
  return id ? POR_ID.get(id)!.nombre : 'Iniciales de la comunidad'
}

/** Coincide por palabras, sin tildes y con nombres deportivos alternativos (bici, MTB, ping-pong…). */
export function filtrarImagenesComunidad(busqueda: string, grupo?: GrupoImagenComunidad): readonly OpcionImagenComunidad[] {
  const palabras = normalizeName(busqueda).split(/\s+/u).filter(Boolean)
  return CATALOGO_IMAGENES_COMUNIDAD.filter(e => {
    if (grupo && e.grupo !== grupo) return false
    const texto = normalizeName([e.nombre, e.deporte, ...e.busqueda].join(' '))
    return palabras.every(p => texto.includes(p))
  })
}
