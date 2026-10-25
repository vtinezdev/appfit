// Intérprete local, paso 1: parte una frase («200 g de arroz, 2 huevos y un plátano») en alimentos con su cantidad.
// Sin IA ni conexión. El dictado del teclado de iOS escribe el texto (suele poner cifras: «200 gramos», «2 huevos»).
import { normalizeName, tokensConsulta } from '../../../../shared/lib/text'
import { UNIDADES_EXACTAS, unidadEn, type Unidad } from './unidades'

export interface ParteComida {
  /** El trozo de la frase tal cual, para mostrarlo o depurar. */
  texto: string
  cantidad?: number
  unidad?: Unidad
  /** Nombre normalizado de una ración propia del usuario escrita como unidad («2 rebanadas de pan bimbo»). */
  unidadPropia?: string
  /** Lo que queda al quitar cantidad y unidad, con sus tildes («plátano», «pechuga de pollo»). */
  nombre: string
  /** Palabras útiles de `nombre` en singular, separadas por espacios (ver `tokensConsulta`): lo que se busca. */
  consulta: string
}

/**
 * Separadores entre alimentos: `,` (salvo la coma decimal: «1,5 kg»), `;`, `+`, salto de línea, punto seguido
 * y las conjunciones «y»/«e». «Con» solo separa si introduce otra cantidad; «arroz con pollo» sigue siendo un plato.
 * «Y medio» forma parte de la cantidad únicamente mientras todavía no hay nombre de alimento a su izquierda.
 */
const SEPARADORES = /(?<!\d),|,(?!\d)|;|\+|\n|\.(?=\s|$)|\s+(?:y|e|con)\s+/gi

/** Contexto habitual del dictado; solo se quita al principio, nunca dentro del nombre de un alimento. */
const INTRODUCCION = /^(?:(?:hoy\s+)?he\s+(?:comido|cenado|desayunado|almorzado|merendado|tomado)|para\s+(?:cenar|comer|desayunar|almorzar|merendar)|(?:en|para)\s+(?:la\s+(?:cena|comida|merienda)|el\s+(?:desayuno|almuerzo))|de\s+postre|adem[aá]s|tambi[eé]n)\b\s*:?\s*/i
const SIN_ALIMENTO = new Set(['y', 'e', 'con', 'de', 'del', 'el', 'la', 'los', 'las', 'un', 'una'])

function limpiarParte(texto: string): string {
  let limpio = texto
    .trim()
    .replace(/^[-•]\s+/, '')
    .replace(/[()[\]:"«»¿?¡!]/g, ' ')
    // «200g», «1,5kg», «½kg»: separa la cifra de la unidad pegada.
    .replace(/(\d|[½¼¾⅓⅔])(?=\p{L})/gu, '$1 ')
    .trim()
  let anterior: string
  do {
    anterior = limpio
    limpio = limpio.replace(INTRODUCCION, '').replace(/^(?:y|e|con)\b\s*/i, '').trim()
  } while (limpio !== anterior)
  return limpio
}

/** Números escritos con letras (normalizados). El dictado suele escribir cifras, pero no siempre («dos huevos»). */
const NUMEROS: Record<string, number> = {
  un: 1, una: 1, uno: 1, medio: 0.5, media: 0.5, cuarto: 0.25,
  dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
  quince: 15, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, cien: 100, doscientos: 200, trescientos: 300,
}

/** Expresiones de varias palabras, de más larga a más corta: se prueban antes que las palabras sueltas. */
const EXPRESIONES: [string[], number][] = [
  [['media', 'docena'], 6],
  [['una', 'docena'], 12],
  [['un', 'par'], 2],
  [['un', 'cuarto'], 0.25],
  [['tres', 'cuartos'], 0.75],
  [['docena'], 12],
]

const FRACCIONES: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 }

/** Palabras que acompañan a una cantidad sin cambiarla («2 unidades de…», «3 piezas de…»). */
const RELLENO = new Set(['pieza', 'piezas', 'unidad', 'unidades'])

/**
 * Un número sin unidad a partir de este valor se entiende como gramos («arroz 200», «200 de arroz»): nadie
 * come 200 huevos. Por debajo son unidades («15 almendras»).
 */
const MINIMO_GRAMOS_IMPLICITOS = 20

/** Número escrito con cifras: «200», «1,5», «1.5», «1/2», «½». */
function numeroDeCifras(palabra: string): number | undefined {
  if (palabra in FRACCIONES) return FRACCIONES[palabra]
  const fraccion = /^(\d+)\/(\d+)$/.exec(palabra)
  if (fraccion) return Number(fraccion[2]) === 0 ? undefined : Number(fraccion[1]) / Number(fraccion[2])
  if (/^\d+(?:[.,]\d+)?$/.test(palabra)) return Number(palabra.replace(',', '.'))
  return undefined
}

/** Cantidad al principio de `norm` (palabras normalizadas): valor y palabras que ocupa. */
function cantidadAlPrincipio(norm: string[]): { valor: number; usadas: number } | undefined {
  for (const [expresion, valor] of EXPRESIONES) {
    if (expresion.every((p, i) => norm[i] === p)) return { valor, usadas: expresion.length }
  }
  const primera = norm[0]
  if (primera === undefined) return undefined
  const valor = numeroDeCifras(primera) ?? NUMEROS[primera]
  if (valor === undefined) return undefined
  // «1 y medio», «dos y media»
  if (norm[1] === 'y' && (norm[2] === 'medio' || norm[2] === 'media')) return { valor: valor + 0.5, usadas: 3 }
  return { valor, usadas: 1 }
}

/** Quita la cantidad y la unidad del principio o, si no hay, del final («arroz 200 g»). */
function extraerCantidad(palabras: string[], propias?: ReadonlyMap<string, string>): { cantidad?: number; unidad?: Unidad; unidadPropia?: string; resto: string[] } {
  const norm = palabras.map(normalizeName)
  let i = 0
  let cantidad: number | undefined
  let unidad: Unidad | undefined
  let unidadPropia: string | undefined

  const inicio = cantidadAlPrincipio(norm)
  if (inicio) {
    cantidad = inicio.valor
    i = inicio.usadas
  }
  // «un cuarto de kilo»: la unidad puede venir tras un «de».
  const saltaDe = norm[i] === 'de' && unidadEn(norm, i + 1) !== undefined ? 1 : 0
  const u = unidadEn(norm, i + saltaDe)
  const up = propias?.get(norm[i + saltaDe] ?? '')
  // Una unidad casera sin número («vaso de leche») cuenta como una; una de peso sin número («g de arroz») no se entiende.
  if ((u !== undefined && (cantidad !== undefined || !UNIDADES_EXACTAS.has(u))) || (up !== undefined && norm[i + saltaDe + 1] !== undefined)) {
    unidad = u
    unidadPropia = up
    i += saltaDe + 1
    cantidad ??= 1
    // «1 kilo y medio»
    if (norm[i] === 'y' && (norm[i + 1] === 'medio' || norm[i + 1] === 'media')) {
      cantidad += 0.5
      i += 2
    }
  } else if (cantidad !== undefined && RELLENO.has(norm[i])) {
    i += 1
  }
  if (i > 0) {
    if (norm[i] === 'de' || norm[i] === 'del') i += 1
    return { cantidad, unidad, unidadPropia, resto: palabras.slice(i) }
  }

  // Al final: «arroz 200 g», «arroz 200g», «huevos 2».
  const n = norm.length
  const uFinal = n >= 3 ? unidadEn(norm, n - 1) : undefined
  const numFinal = uFinal !== undefined ? numeroDeCifras(norm[n - 2]) : n >= 2 ? numeroDeCifras(norm[n - 1]) : undefined
  if (numFinal !== undefined) {
    return { cantidad: numFinal, unidad: uFinal, resto: palabras.slice(0, uFinal !== undefined ? n - 2 : n - 1) }
  }
  return { resto: palabras }
}

/** Interpreta un trozo con un solo alimento. `undefined` si no queda nombre (p. ej. «200 g» suelto). */
export function parsearParte(texto: string, propias?: ReadonlyMap<string, string>): ParteComida | undefined {
  const limpio = limpiarParte(texto)
  if (!limpio) return undefined
  const { cantidad, unidad, unidadPropia, resto } = extraerCantidad(limpio.split(/\s+/), propias)
  const nombre = resto.join(' ').trim()
  const consulta = tokensConsulta(nombre).join(' ')
  if (!consulta || resto.every((p) => SIN_ALIMENTO.has(normalizeName(p)))) return undefined
  const parte: ParteComida = { texto: texto.trim(), nombre, consulta }
  if (cantidad !== undefined && cantidad > 0) {
    parte.cantidad = cantidad
    if (unidad !== undefined) parte.unidad = unidad
    else if (unidadPropia === undefined && cantidad >= MINIMO_GRAMOS_IMPLICITOS) parte.unidad = 'g'
    if (unidadPropia !== undefined) parte.unidadPropia = unidadPropia
  }
  return parte
}

/** Parte una frase en alimentos. Los trozos sin alimento («y», «200 g» suelto) se descartan. */
export function parsear(texto: string, propias?: ReadonlyMap<string, string>): ParteComida[] {
  const partes: ParteComida[] = []
  let inicio = 0
  for (const separador of texto.matchAll(SEPARADORES)) {
    const izquierda = texto.slice(inicio, separador.index)
    const derecha = texto.slice(separador.index + separador[0].length)
    const conjuncion = separador[0].trim().toLowerCase()
    if (conjuncion === 'con' || conjuncion === 'e') {
      const norm = limpiarParte(derecha).split(/\s+/).map(normalizeName)
      const nuevaCantidad = cantidadAlPrincipio(norm) !== undefined
      if (conjuncion === 'con' && !nuevaCantidad) continue
      if (conjuncion === 'e' && !nuevaCantidad && !/^h?[iy]/i.test(norm[0])) continue
    }
    if (conjuncion === 'y' && /^\s*medi[oa]\b/i.test(derecha)) {
      const anterior = extraerCantidad(limpiarParte(izquierda).split(/\s+/))
      // «1 kilo y medio de patatas» frente a «2 huevos y medio aguacate».
      if (anterior.cantidad !== undefined && anterior.resto.length === 0) continue
    }
    const parte = parsearParte(izquierda, propias)
    if (parte) partes.push(parte)
    inicio = separador.index + separador[0].length
  }
  const ultima = parsearParte(texto.slice(inicio), propias)
  if (ultima) partes.push(ultima)
  return partes
}
