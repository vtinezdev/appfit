// Unidades que entiende el intérprete local: peso y volumen (exactas) y medidas caseras (aproximadas).
// Los volúmenes se toman como gramos (ml ≈ g): el error es pequeño para lo que se mide así (leche, zumo, aceite a cucharadas).

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
  | 'rebanada'
  | 'punado'
  | 'lata'
  | 'loncha'
  | 'cazo'
  | 'plato'
  | 'racion'
  | 'chorrito'

/** Gramos por unidad. Peso y volumen son exactos; las medidas caseras, un valor típico que `raciones.ts` puede afinar por alimento. */
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
  rebanada: 30,
  punado: 30,
  lata: 80,
  loncha: 20,
  cazo: 30,
  plato: 250,
  racion: 150,
  chorrito: 10,
}

/** Unidades de peso o volumen: los gramos salen de la cantidad, sin depender del alimento. */
export const UNIDADES_EXACTAS: ReadonlySet<Unidad> = new Set(['g', 'kg', 'ml', 'cl', 'l'])

/**
 * Formas escritas (ya normalizadas: minúsculas y sin tildes) de cada unidad. Incluye plurales y abreviaturas,
 * y lo que suele escribir el dictado de iOS («200 gramos», «medio litro»).
 */
const FORMAS: Record<Unidad, string[]> = {
  g: ['g', 'gr', 'grs', 'gramo', 'gramos'],
  kg: ['kg', 'kgs', 'kilo', 'kilos', 'kilogramo', 'kilogramos'],
  ml: ['ml', 'mililitro', 'mililitros'],
  cl: ['cl', 'centilitro', 'centilitros'],
  l: ['l', 'litro', 'litros'],
  cucharada: ['cucharada', 'cucharadas', 'cda', 'cdas'],
  cucharadita: ['cucharadita', 'cucharaditas', 'cdta', 'cdtas'],
  vaso: ['vaso', 'vasos'],
  taza: ['taza', 'tazas', 'tazon', 'tazones', 'bol', 'bols', 'cuenco', 'cuencos'],
  rebanada: ['rebanada', 'rebanadas'],
  punado: ['punado', 'punados'],
  lata: ['lata', 'latas'],
  loncha: ['loncha', 'lonchas', 'lonja', 'lonjas'],
  cazo: ['cazo', 'cazos', 'cacito', 'cacitos', 'scoop', 'scoops'],
  plato: ['plato', 'platos'],
  racion: ['racion', 'raciones', 'porcion', 'porciones'],
  chorrito: ['chorrito', 'chorritos', 'chorro', 'chorros'],
}

const POR_FORMA = new Map<string, Unidad>(Object.entries(FORMAS).flatMap(([u, formas]) => formas.map((f) => [f, u as Unidad])))

/** La unidad que corresponde a una palabra ya normalizada, o `undefined` si no es una unidad. */
export function unidadDe(palabra: string): Unidad | undefined {
  return POR_FORMA.get(palabra)
}
