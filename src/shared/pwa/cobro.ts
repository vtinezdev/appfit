// Dónde se aplica el cobro (ADR 068): solo en la app de Google Play, y todavía no: `COBRO_ACTIVO` se enciende cuando se
// pueda pagar con Play Billing (parte 3). La web y el iPhone siguen abiertos. `?preview=cobro` lo enciende en esta sesión
// para probar el bloqueo en cualquier sitio (solo afecta a quien lo abre así).
import type { EntornoAcceso } from '../lib/acceso'
import { esAppAndroid } from './entorno'

export const COBRO_ACTIVO = false
const CLAVE_PREVIEW = 'appfit-preview-cobro'

/** Puro: el bloqueo se aplica con la vista previa, o en la app de Android con el cobro encendido. */
export function aplicaCobro({ activo, appAndroid, preview }: { activo: boolean; appAndroid: boolean; preview: boolean }): boolean {
  return preview || (activo && appAndroid)
}

/** Puro: `?preview=cobro` en la dirección, o lo recordado en la sesión tras recargar. */
export function detectarPreviewCobro(search: string, recordado: string | null): boolean {
  return recordado === '1' || new URLSearchParams(search).getAll('preview').includes('cobro')
}

let preview: boolean | undefined

function previewCobro(): boolean {
  if (preview !== undefined) return preview
  let recordado: string | null = null
  try { recordado = sessionStorage.getItem(CLAVE_PREVIEW) } catch { /* sin almacenamiento de sesión: solo la dirección */ }
  preview = typeof location !== 'undefined' && detectarPreviewCobro(location.search, recordado)
  if (preview) { try { sessionStorage.setItem(CLAVE_PREVIEW, '1') } catch { /* nada que recordar */ } }
  return preview
}

// Desbloqueo recordado en este móvil (parte 2 del ADR 068): lo pone `desbloqueo/DesbloqueoContext` al preguntar a la nube
// con la cuenta abierta. Vive en localStorage, fuera de IndexedDB: no viaja en el backup ni en la copia, ni se borra con
// «Borrar registros». Sin red, vale lo último que se supo.
const CLAVE_DESBLOQUEO = 'appfit-desbloqueo'
const oyentes = new Set<() => void>()

export function desbloqueadoAqui(): boolean {
  try { return localStorage.getItem(CLAVE_DESBLOQUEO) === '1' } catch { return false }
}

export function recordarDesbloqueo(desbloqueado: boolean): void {
  if (desbloqueado === desbloqueadoAqui()) return
  try {
    if (desbloqueado) localStorage.setItem(CLAVE_DESBLOQUEO, '1')
    else localStorage.removeItem(CLAVE_DESBLOQUEO)
  } catch { /* sin almacenamiento: se volverá a preguntar al abrir */ }
  oyentes.forEach((f) => f())
}

export function observarDesbloqueo(oyente: () => void): () => void {
  oyentes.add(oyente)
  return () => { oyentes.delete(oyente) }
}

/** El entorno de esta sesión. */
export function entornoAcceso(): EntornoAcceso {
  return { aplica: aplicaCobro({ activo: COBRO_ACTIVO, appAndroid: esAppAndroid(), preview: previewCobro() }), desbloqueado: desbloqueadoAqui() }
}
