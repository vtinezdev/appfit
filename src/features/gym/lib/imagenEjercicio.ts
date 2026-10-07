import { EJERCICIOS_CON_IMAGEN } from './ejerciciosConImagen'

const PREFIJO = 'appfit:'

/**
 * URL (del propio origen) de la imagen de referencia de un ejercicio del catálogo, o null si no tiene.
 * Se decide con la lista generada `ejerciciosConImagen.ts`, sin pedir nada a la red.
 */
export function imagenEjercicio(catalogId: string | undefined | null): string | null {
  if (!catalogId?.startsWith(PREFIJO)) return null
  const slug = catalogId.slice(PREFIJO.length)
  return EJERCICIOS_CON_IMAGEN.has(slug) ? `${import.meta.env.BASE_URL}ejercicios/${slug}.webp` : null
}
