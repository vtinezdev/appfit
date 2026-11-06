// En la app de Google Play no se enseña el aviso de versión nueva (ADR 067): la versión descargada se aplica sola al
// abrirla, antes de que se empiece a usar, o al volver a ella tras un rato fuera, que para quien la usa es abrirla otra
// vez. Nunca mientras se está usando: recargar a mitad de algo perdería lo que se está escribiendo.

/** Ausencia a partir de la cual volver a la app cuenta como abrirla de nuevo. */
export const AUSENCIA_REAPERTURA_MS = 30 * 60000

/** `arranque`: la primera comprobación tras abrir; `vuelta`: la primera tras volver a la app; `uso`: cualquier otra. */
export type MomentoComprobacion = 'arranque' | 'vuelta' | 'uso'

export function aplicarSola(p: { appAndroid: boolean; hayActualizacion: boolean; momento: MomentoComprobacion; ausenteMs: number }): boolean {
  if (!p.appAndroid || !p.hayActualizacion) return false
  return p.momento === 'arranque' || (p.momento === 'vuelta' && p.ausenteMs >= AUSENCIA_REAPERTURA_MS)
}
