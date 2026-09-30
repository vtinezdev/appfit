// Textos de la sección «Catálogo de alimentos» de Ajustes (puros, para poder probarlos).
import type { CatalogSource } from '../../../../shared/db/types'
import { formatInt } from '../../../../shared/lib/format'
import type { ResultadoSincronizacion } from './sincronizar'

const NOMBRES_FUENTE: Record<string, string> = {
  ciqual: 'CIQUAL (ANSES)',
  off: 'Open Food Facts',
}

/** Nombre legible de una fuente; si no se conoce, el id en mayúsculas. */
export function nombreFuente(id: string): string {
  return NOMBRES_FUENTE[id] ?? id.toUpperCase()
}

const ETIQUETAS_FUENTE: Record<string, string> = {
  ciqual: 'CIQUAL',
  off: 'Open Food Facts',
}

/** Nombre corto de una fuente para etiquetar un alimento (p. ej. en la revisión); si no se conoce, el id en mayúsculas. */
export function etiquetaFuente(id: string): string {
  return ETIQUETAS_FUENTE[id] ?? id.toUpperCase()
}

/** Detalle de una fuente instalada: versión y filas; los productos escaneados (`live`) no tienen versión. */
export function detalleFuente(f: Pick<CatalogSource, 'version' | 'filas'>): string {
  if (f.version === 'live') return `${formatInt(f.filas)} ${f.filas === 1 ? 'producto escaneado' : 'productos escaneados'}`
  return `${f.version} · ${formatInt(f.filas)} alimentos`
}

/** Resultado de «Buscar actualización», en una línea. */
export function resumenResultado(r: ResultadoSincronizacion): string {
  if (r.actualizadas.length === 0) return 'Ya está al día.'
  return `Actualizado a ${r.actualizadas.map((a) => `${nombreFuente(a.id)} ${a.version}`).join(', ')}.`
}

/** Error de la actualización con un texto que dice qué hacer (el de `fetch` en Safari es «Load failed»). */
export function mensajeError(e: unknown, enLinea: boolean): string {
  if (!enLinea) return 'Sin conexión. Vuelve a intentarlo cuando tengas internet.'
  const detalle = e instanceof Error && e.message ? ` (${e.message})` : ''
  return `No se pudo actualizar el catálogo${detalle}. Tus datos no han cambiado; inténtalo de nuevo más tarde.`
}
