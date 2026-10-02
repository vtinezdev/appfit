import { normalizeName } from '../../../shared/lib/text'
import { claveRef, refDe } from '../../../shared/db/foodRef'
import type { Entry } from '../../../shared/db/types'

/**
 * Sugiere nombres de pantalla para casos inequívocos. Los nombres no incluidos se conservan completos;
 * no se eliminan descriptores de preparación, variedad o marca mediante recortes genéricos.
 */
export function sugerirNombreCorto(nombre: string): string {
  const normalizado = normalizeName(nombre).replace(/[,.()]/g, ' ').replace(/\s+/g, ' ').trim()
  if (normalizado === 'cafe instantaneo sin azucares anadidos listo para beber') return 'Café'

  const leche = nombre.match(/^(leche\s+.+?)(?:\s*\(\s*promedio\s*\)|,\s*promedio|\s+promedio)\s*$/i)
  if (leche) return leche[1].trim()

  return nombre
}

/** Nombre visible de un registro: preferencia personal, regla segura o nombre completo original. */
export function nombreVisible(entry: Entry, personales: ReadonlyMap<string, string>): string {
  if (entry.rapida) return entry.nombre
  try {
    const ref = refDe(entry)
    return (ref && personales.get(claveRef(ref))) || sugerirNombreCorto(entry.nombre)
  } catch {
    return sugerirNombreCorto(entry.nombre)
  }
}
