// Unidades que entiende el intérprete local: peso y volumen (exactas) y medidas caseras (aproximadas).
// Los volúmenes se toman como gramos (ml ≈ g): el error es pequeño para lo que se mide así (leche, zumo, aceite a cucharadas).
import { normalizeName } from '../../../../shared/lib/text'

export type Unidad =
  | 'g'
  | 'kg'
  | 'ml'
  | 'cl'
  | 'l'
  | 'cucharada'
  | 'cucharadita'
  | 'vaso'
  | 'taza'
  | 'bol'
  | 'rebanada'
  | 'punado'
  | 'lata'
  | 'loncha'
  | 'scoop'
  | 'cazo'
  | 'plato'
  | 'racion'
  | 'porcion'
  | 'chorrito'
  | 'trozo'
  | 'filete'
  | 'bola'
  | 'onza'
  | 'nuez'
  | 'copa'
  | 'cana'
  | 'quinto'
  | 'botellin'
  | 'tercio'
  | 'jarra'
  | 'pizca'

/**
 * Gramos por unidad. Peso y volumen son exactos; las medidas caseras, un valor típico que `raciones.ts` puede afinar
 * por alimento. Las ambiguas (`medidas.ts`) no usan este valor: se pregunta cuánto es una.
 */
export const GRAMOS_POR_UNIDAD: Record<Unidad, number> = {
  g: 1,
  kg: 1000,
  ml: 1,
  cl: 10,
  l: 1000,
  cucharada: 15,
  cucharadita: 5,
  vaso: 200,
  taza: 250,
  bol: 300,
  rebanada: 30,
  punado: 30,
  lata: 80,
  loncha: 20,
  scoop: 30,
  cazo: 150,
  plato: 250,
  racion: 150,
  porcion: 80,
  chorrito: 10,
  trozo: 50,
  filete: 150,
  bola: 60,
  onza: 7,
  nuez: 10,
  copa: 150,
  cana: 200,
  quinto: 200,
  botellin: 250,
  tercio: 330,
  jarra: 500,
  pizca: 1,
}

/** Unidades de peso o volumen: los gramos salen de la cantidad, sin depender del alimento. */
export const UNIDADES_EXACTAS: ReadonlySet<Unidad> = new Set(['g', 'kg', 'ml', 'cl', 'l'])

/**
 * Formas escritas de cada unidad, la primera es su nombre. Incluye plurales y abreviaturas, y lo que suele escribir
 * el dictado de iOS («200 gramos», «medio litro»). Se comparan normalizadas (sin tildes ni mayúsculas).
 */
export const FORMAS: Record<Unidad, readonly string[]> = {
  g: ['g', 'gr', 'grs', 'gramo', 'gramos'],
  kg: ['kg', 'kgs', 'kilo', 'kilos', 'kilogramo', 'kilogramos'],
  ml: ['ml', 'mililitro', 'mililitros'],
  cl: ['cl', 'centilitro', 'centilitros'],
  l: ['l', 'litro', 'litros'],
  cucharada: ['cucharada', 'cucharadas', 'cda', 'cdas'],
  cucharadita: ['cucharadita', 'cucharaditas', 'cdta', 'cdtas'],
  vaso: ['vaso', 'vasos'],
  taza: ['taza', 'tazas'],
  bol: ['bol', 'bols', 'tazón', 'tazones', 'cuenco', 'cuencos'],
  rebanada: ['rebanada', 'rebanadas'],
  punado: ['puñado', 'puñados'],
  lata: ['lata', 'latas'],
  loncha: ['loncha', 'lonchas', 'lonja', 'lonjas'],
  scoop: ['scoop', 'scoops', 'cacito', 'cacitos'],
  cazo: ['cazo', 'cazos', 'cucharón', 'cucharones'],
  plato: ['plato', 'platos'],
  racion: ['ración', 'raciones'],
  porcion: ['porción', 'porciones'],
  chorrito: ['chorrito', 'chorritos', 'chorro', 'chorros'],
  trozo: ['trozo', 'trozos', 'pedazo', 'pedazos'],
  filete: ['filete', 'filetes'],
  bola: ['bola', 'bolas'],
  onza: ['onza', 'onzas'],
  nuez: ['nuez'],
  copa: ['copa', 'copas'],
  cana: ['caña', 'cañas'],
  quinto: ['quinto', 'quintos'],
  botellin: ['botellín', 'botellines'],
  tercio: ['tercio', 'tercios'],
  jarra: ['jarra', 'jarras'],
  pizca: ['pizca', 'pizcas'],
}

/**
 * Unidades que también son un alimento o un plato («filete», «caña», «un tercio»): solo cuentan como unidad delante
 * de «de» («un filete de pollo», «una caña de cerveza»). Sin él, la palabra es el alimento («filete empanado»).
 */
export const SOLO_CON_DE: ReadonlySet<Unidad> = new Set([
  'trozo', 'filete', 'bola', 'onza', 'nuez', 'copa', 'cana', 'quinto', 'botellin', 'tercio', 'jarra', 'pizca',
])

/** Y alguna, solo delante de ciertos alimentos: «una nuez de mantequilla» es una medida; «2 nueces de macadamia», nueces. */
export const SOLO_DELANTE_DE: Partial<Record<Unidad, readonly string[]>> = { nuez: ['mantequilla', 'margarina'] }

const POR_FORMA = new Map<string, Unidad>(Object.entries(FORMAS).flatMap(([u, formas]) => formas.map((f) => [normalizeName(f), u as Unidad])))

/** La unidad que corresponde a una palabra ya normalizada, o `undefined` si no es una unidad. */
function unidadDe(palabra: string): Unidad | undefined {
  return POR_FORMA.get(palabra)
}

/**
 * La unidad en la posición `i` de una frase (palabras normalizadas), mirando lo que viene detrás: `undefined` si no
 * es una unidad o si en ese contexto no lo es (ver `SOLO_CON_DE` y `SOLO_DELANTE_DE`).
 */
export function unidadEn(palabras: readonly string[], i: number): Unidad | undefined {
  const u = unidadDe(palabras[i] ?? '')
  if (u === undefined) return undefined
  if (SOLO_CON_DE.has(u) && palabras[i + 1] !== 'de') return undefined
  const alimentos = SOLO_DELANTE_DE[u]
  if (alimentos && !alimentos.includes(palabras[i + 2] ?? '')) return undefined
  return u
}
