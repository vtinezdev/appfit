/** Forma canónica de un nombre para comparar y buscar: sin espacios sobrantes, minúsculas y sin tildes. */
export function normalizeName(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/**
 * Palabras normalizadas y sin repetir de un texto: los valores del índice `*tok`. Es lo único que se normaliza
 * para buscar (ñ → n, sin tildes, minúsculas): `nombre` y `nombreOriginal` se guardan tal cual para mostrarlos.
 * Separa por lo que no sea letra o número Unicode (así `ß`, `ø` o el griego no desaparecen como separadores).
 */
export function tokenizar(texto: string): string[] {
  return [...new Set(normalizeName(texto).split(/[^\p{L}\p{N}]+/u).filter(Boolean))]
}

/** Palabras que no ayudan a buscar un alimento («pechuga de pollo» → pechuga, pollo). «sin» sí cuenta («sin azúcar»). */
const PALABRAS_VACIAS = new Set(['de', 'del', 'el', 'la', 'los', 'las', 'y', 'o', 'a', 'al', 'en', 'un', 'una', 'con'])

/**
 * Raíz singular aproximada de una palabra ya normalizada, para buscar por prefijo: «lentejas» → «lenteja»,
 * «limones» → «limon», «nueces» → «nuez». No es un lematizador: basta con que la raíz sea prefijo de la forma
 * singular («tomates» → «tomat», que casa con «tomate»). Nunca deja menos de 3 letras.
 */
export function singular(t: string): string {
  let raiz = t
  if (t.endsWith('ces')) raiz = `${t.slice(0, -3)}z`
  else if (/[^aeiou]es$/.test(t)) raiz = t.slice(0, -2)
  else if (t.endsWith('s')) raiz = t.slice(0, -1)
  return raiz.length >= 3 ? raiz : t
}

/**
 * true si dos palabras ya pasadas por `singular` son la misma palabra: iguales o una es la otra más una letra
 * («tomat», de «tomates», y «tomate»). Compensa que `singular` solo dé una raíz aproximada.
 */
export function mismaRaiz(a: string, b: string): boolean {
  if (a === b) return true
  const [corta, larga] = a.length <= b.length ? [a, b] : [b, a]
  return corta.length >= 3 && larga.length - corta.length === 1 && larga.startsWith(corta)
}

/**
 * Palabras útiles para buscar: las de `tokenizar`, sin palabras vacías y en singular (`singular`), sin repetir.
 * Si solo hay palabras vacías (alguien escribe «con»), se conservan para no dejar la consulta sin tokens.
 * Se aplica igual a la consulta y a los nombres al ordenar, para compararlos en la misma forma.
 */
export function tokensConsulta(q: string): string[] {
  const tokens = tokenizar(q)
  const utiles = tokens.filter((t) => !PALABRAS_VACIAS.has(t))
  return [...new Set((utiles.length > 0 ? utiles : tokens).map(singular))]
}
