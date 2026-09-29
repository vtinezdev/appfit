// Textos de la sección «Catálogo de alimentos» de Ajustes (puros, para poder probarlos).
import type { ResultadoSincronizacion } from './sincronizar'

const NOMBRES_FUENTE: Record<string, string> = {
  ciqual: 'CIQUAL (ANSES)',
}

/** Nombre legible de una fuente; si no se conoce, el id en mayúsculas. */
export function nombreFuente(id: string): string {
  return NOMBRES_FUENTE[id] ?? id.toUpperCase()
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
