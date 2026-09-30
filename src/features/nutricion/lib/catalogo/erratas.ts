// Corrección de erratas al buscar en el catálogo. Puro y sin librerías: distancia de Damerau-Levenshtein (con
// transposición de letras adyacentes) contra el vocabulario del índice de búsqueda (`tok`).
// Solo se usa cuando la búsqueda normal no da resultados, para no cambiar lo que el usuario escribe si ya
// encuentra algo.
import { normalizeName } from '../../../../shared/lib/text'

/** Distancia máxima que se tolera según la longitud de la palabra: cuanto más corta, menos margen. */
export function distanciaMaxima(longitud: number): number {
  if (longitud <= 3) return 0
  if (longitud <= 6) return 1
  return 2
}

/**
 * Distancia de Damerau-Levenshtein (variante «optimal string alignment»: inserción, borrado, sustitución y
 * transposición de dos letras adyacentes). Devuelve `max + 1` en cuanto sabe que la distancia supera `max`.
 */
export function distancia(a: string, b: string, max: number): number {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > max) return max + 1
  const n = a.length
  const m = b.length
  let anterior2: number[] = []
  let anterior: number[] = Array.from({ length: m + 1 }, (_, j) => j)
  for (let i = 1; i <= n; i++) {
    const actual: number[] = [i]
    let minimoFila = i
    for (let j = 1; j <= m; j++) {
      const coste = a[i - 1] === b[j - 1] ? 0 : 1
      let d = Math.min(anterior[j] + 1, actual[j - 1] + 1, anterior[j - 1] + coste)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, anterior2[j - 2] + 1)
      actual[j] = d
      if (d < minimoFila) minimoFila = d
    }
    if (minimoFila > max) return max + 1
    anterior2 = anterior
    anterior = actual
  }
  return anterior[m] > max ? max + 1 : anterior[m]
}

/** true si alguna palabra del vocabulario (ordenado) empieza por `prefijo`. Búsqueda binaria. */
function hayPalabraQueEmpiezaPor(vocabulario: readonly string[], prefijo: string): boolean {
  let lo = 0
  let hi = vocabulario.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (vocabulario[mid] < prefijo) lo = mid + 1
    else hi = mid
  }
  return lo < vocabulario.length && vocabulario[lo].startsWith(prefijo)
}

/** Cuántos alimentos contienen cada palabra del vocabulario (para desempatar entre candidatas). */
export type Frecuencias = ReadonlyMap<string, number>

/**
 * La palabra del vocabulario más parecida a `token` (contra la palabra entera y contra su prefijo de igual longitud).
 * Empates, por este orden: la que no es más corta que lo escrito (lo habitual es que falte una letra, no que sobre:
 * «platno» → «platano», no «plato»), la más frecuente en el catálogo y, por último, la alfabética.
 */
function mejorCandidata(token: string, vocabulario: readonly string[], frecuencias?: Frecuencias): string | undefined {
  const max = distanciaMaxima(token.length)
  if (max === 0) return undefined
  let mejor: string | undefined
  let mejorDistancia = max + 1
  const mejorQue = (w: string, d: number): boolean => {
    if (mejor === undefined || d < mejorDistancia) return true
    if (d > mejorDistancia) return false
    const larga = w.length >= token.length
    const mejorLarga = mejor.length >= token.length
    if (larga !== mejorLarga) return larga
    const f = frecuencias?.get(w) ?? 0
    const fm = frecuencias?.get(mejor) ?? 0
    return f > fm // a igualdad total se queda la primera (orden alfabético del vocabulario)
  }
  for (const w of vocabulario) {
    // Contra la palabra entera (errata en una palabra completa)...
    let d = distancia(token, w, Math.min(max, mejorDistancia))
    // ...y contra su prefijo de la misma longitud (errata mientras se escribe: «platn» → «plat…»).
    if (w.length > token.length) d = Math.min(d, distancia(token, w.slice(0, token.length), Math.min(max, mejorDistancia)))
    if (d <= max && mejorQue(w, d)) {
      mejorDistancia = d
      mejor = w
    }
  }
  return mejor
}

export interface TokensCorregidos {
  /** Los tokens, con las erratas corregidas. */
  tokens: string[]
  /** true si al menos un token cambió. */
  corregido: boolean
}

/**
 * Corrige las erratas de una consulta ya tokenizada (`tokensConsulta`) contra el vocabulario del índice
 * (palabras normalizadas y ordenadas). Un token solo se toca si NINGUNA palabra del vocabulario empieza por él:
 * si «plat» ya encuentra «plátano», no se «corrige». Los tokens de hasta 3 letras nunca se corrigen (demasiados
 * falsos positivos), los de 4–6 admiten 1 letra de diferencia y los de 7 o más, 2.
 */
export function corregirTokens(tokens: string[], vocabulario: readonly string[], frecuencias?: Frecuencias): TokensCorregidos {
  let corregido = false
  const res = tokens.map((t) => {
    if (hayPalabraQueEmpiezaPor(vocabulario, t)) return t
    const c = mejorCandidata(t, vocabulario, frecuencias)
    if (c === undefined) return t
    corregido = true
    return c
  })
  return { tokens: res, corregido }
}

/**
 * Para mostrar «Resultados para «plátano»»: el vocabulario va sin tildes, así que se busca en los nombres de los
 * resultados la palabra que normalizada empieza por el token y se usa tal cual se escribe. Si no aparece, el token.
 */
export function conTildes(tokens: string[], nombres: readonly string[]): string {
  const palabras = nombres.flatMap((n) => n.split(/[^\p{L}\p{N}]+/u).filter(Boolean))
  return tokens
    .map((t) => {
      const p = palabras.find((w) => normalizeName(w).startsWith(t))
      return p ? p.toLowerCase() : t
    })
    .join(' ')
}
