export interface VersionApp { id: string; fecha: string }

export type FaseActualizacion = 'sin-comprobar' | 'comprobando' | 'al-dia' | 'disponible' | 'aplicando' | 'sin-conexion' | 'error' | 'desarrollo'
export interface EstadoActualizacion {
  fase: FaseActualizacion
  hayActualizacion: boolean
  comprobadaEn: number | null
  error: string | null
}

export function leerVersion(datos: unknown): VersionApp {
  if (!datos || typeof datos !== 'object') throw new Error('Versión no válida')
  const v = datos as Record<string, unknown>
  if (typeof v.id !== 'string' || !v.id.trim() || v.id.length > 160 || typeof v.fecha !== 'string' || !Number.isFinite(Date.parse(v.fecha))) throw new Error('Versión no válida')
  return { id: v.id, fecha: v.fecha }
}

export function textoActualizacion(estado: EstadoActualizacion): string {
  switch (estado.fase) {
    case 'sin-comprobar': return 'Actualización sin comprobar'
    case 'comprobando': return 'Comprobando actualizaciones…'
    case 'al-dia': return 'App al día'
    case 'disponible': return 'Actualización disponible'
    case 'aplicando': return 'Actualizando la app…'
    case 'sin-conexion': return estado.hayActualizacion ? 'Actualización pendiente · Sin conexión' : 'Sin conexión para comprobar'
    case 'error': return estado.hayActualizacion ? 'Actualización pendiente' : 'No se ha podido comprobar'
    case 'desarrollo': return 'Versión de desarrollo'
  }
}
