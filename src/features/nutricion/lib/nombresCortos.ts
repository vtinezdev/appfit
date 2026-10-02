import { normalizeName } from '../../../shared/lib/text'
import { claveRef, refDe } from '../../../shared/db/foodRef'
import type { Entry } from '../../../shared/db/types'

/** Cantidades, artículos y tamaños no identifican el alimento. */
const CANTIDAD_INICIAL = /^(?:\d+(?:[.,]\d+)?\s*(?:kg|g|ml|cl|l|%)?\s+)+(?:(?:de|del)\s+)?/i
const PREFIJOS = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'mini', 'maxi', 'bio', 'eco'])

// Solo al principio: «filete de merluza» es merluza; «sopa de merluza» sigue siendo sopa.
const CORTE_ALIMENTO = /^(?:pechugas?|muslos?|contramuslos?|alas?|alitas?|filetes?|solomillos?|chuletas?|lomos?|costillas?|carne(?: picada)?) (?:de|del) (?=[\p{L}])/u

// Estos complementos identifican el alimento, en lugar de describir cómo está preparado.
const NOMBRE_COMPUESTO = /^(?:fruta de la pasion|frutos del bosque|frutos secos|cafe con leche|chocolate caliente|dulce de leche|foie gras|trigo sarraceno|pez espada|san miguel|coca cola|(?:claras?|yemas?) de huevos?|(?:aceite|harina|mantequilla|crema|pure|bebida|zumo|nectar|copos|salvado|proteina|tortitas?) de (?:fruta de la pasion|frutos del bosque|frutos secos|[\p{L}]+))(?=\s|$)/u

function capitalizar(nombre: string): string {
  return nombre.charAt(0).toLocaleUpperCase('es') + nombre.slice(1)
}

/** Regla general para cualquier alimento: nombre principal sin descripciones, con excepciones para nombres compuestos. */
export function sugerirNombreCorto(nombre: string): string {
  const original = nombre.trim().replace(/\s+/g, ' ')
  const encabezado = original.replace(CANTIDAD_INICIAL, '').replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').split(/[,;:]/)[0]
  const palabras: string[] = encabezado.match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu) ?? []
  while (palabras.length > 1 && PREFIJOS.has(normalizeName(palabras[0]))) palabras.shift()
  if (palabras.length === 0) return original

  const principal = palabras.join(' ')
  const normalizado = normalizeName(principal)

  const corte = normalizado.match(CORTE_ALIMENTO)
  if (corte) return sugerirNombreCorto(palabras.slice(corte[0].trim().split(' ').length).join(' '))

  const compuesto = normalizado.match(NOMBRE_COMPUESTO)
  if (compuesto) {
    // Recupera las palabras originales para conservar tildes, que solo se eliminan al comparar.
    return capitalizar(palabras.slice(0, compuesto[0].split(' ').length).join(' '))
  }

  // Se aplica también a alimentos nuevos, de marca o ausentes del catálogo, sin una lista cerrada.
  return capitalizar(palabras[0].toLocaleLowerCase('es'))
}

/** Nombre visible de un registro: preferencia personal o etiqueta automática, también para el historial. */
export function nombreVisible(entry: Entry, personales: ReadonlyMap<string, string>): string {
  if (entry.rapida) return entry.nombre
  try {
    const ref = refDe(entry)
    return (ref && personales.get(claveRef(ref))) || sugerirNombreCorto(entry.nombre)
  } catch {
    return sugerirNombreCorto(entry.nombre)
  }
}
