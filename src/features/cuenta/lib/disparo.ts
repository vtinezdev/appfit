/** Espera tras la última escritura antes de subir la copia (las escrituras seguidas se juntan en una subida). */
export const ESPERA_SUBIDA_MS = 15_000
/** Al volver a la app, como mucho una consulta a la nube por este intervalo. */
export const INTERVALO_COMPROBACION_MS = 30_000

/**
 * ¿Cambió algo que va en la copia? Dexie avisa de cada escritura con claves `idb://<base>/<tabla>/<índice>`, también las
 * del catálogo o las de la base del dispositivo, que no cuentan.
 */
export function afectaALaCopia(partes: Iterable<string>, base: string, tablas: readonly string[]): boolean {
  const prefijo = `idb://${base}/`
  for (const parte of partes) {
    if (!parte.startsWith(prefijo)) continue
    const tabla = parte.slice(prefijo.length).split('/')[0]
    if (tablas.includes(tabla)) return true
  }
  return false
}
