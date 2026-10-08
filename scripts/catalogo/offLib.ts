// Lógica pura de la tubería Open Food Facts (selección España) → paquete JSON del catálogo.
// Sin disco ni red: `off.ts` lee el volcado CSV en streaming y llama aquí línea a línea.
// Se ejecuta con el type stripping de Node: solo sintaxis borrable e imports con extensión `.ts`.
//
// Política de calidad: OFF es colaborativo, así que aquí un AVISO de `calidad.ts` excluye el producto
// (en CIQUAL, en cambio, los avisos solo van al informe). Prefiero 3.000 productos fiables a 300.000 dudosos.
import { normalizar, validarAlimento, type AlimentoCalidad, type Hallazgo } from './calidad.ts'
import { categoriaDeOff } from '../../src/features/nutricion/lib/catalogo/categorias.ts'
import { decodificarEntidades, type CategoriaAppfit, type EntradaManifest, type ExtraFila, type Fila, type Paquete } from './ciqualLib.ts'

// ───────────────────────── Columnas ─────────────────────────

/** Columnas del volcado `en.openfoodfacts.org.products.csv.gz` (TSV sin comillas) que se leen. */
export const COLUMNAS_OFF = [
  'code',
  'product_name',
  'quantity',
  'brands',
  'categories_tags',
  'countries_tags',
  'states_tags',
  'data_quality_errors_tags',
  'unique_scans_n',
  'popularity_tags',
  'pnns_groups_2',
  'energy-kcal_100g',
  'energy-kj_100g',
  'energy_100g',
  'fat_100g',
  'saturated-fat_100g',
  'carbohydrates_100g',
  'sugars_100g',
  'fiber_100g',
  'proteins_100g',
  'salt_100g',
  'alcohol_100g',
] as const

export type ColumnaOff = (typeof COLUMNAS_OFF)[number]
export type IndicesOff = Record<ColumnaOff, number>

/** Posición de cada columna en la cabecera. Lanza si falta alguna (el formato del volcado cambió). */
export function indicesDeCabecera(cabecera: string[]): IndicesOff {
  const res = {} as IndicesOff
  const faltan: string[] = []
  for (const c of COLUMNAS_OFF) {
    const i = cabecera.indexOf(c)
    if (i < 0) faltan.push(c)
    res[c] = i
  }
  if (faltan.length > 0) throw new Error(`El volcado de OFF no trae las columnas: ${faltan.join(', ')}`)
  return res
}

// ───────────────────────── GTIN ─────────────────────────

/** Igual que `normalizarGtin` de `src/shared/db/foodRef.ts` (no se importa porque `foodRef.ts` tiene imports sin extensión): GTIN-13 o `undefined`. */
export function normalizarGtin(raw: string): string | undefined {
  const d = raw.replace(/\D/g, '')
  if (d.length < 8 || d.length > 14) return undefined
  if (d.length === 14) return d.startsWith('0') ? d.slice(1) : d
  return d.padStart(13, '0')
}

// ───────────────────────── Nombre ─────────────────────────

const UNIDADES = String.raw`(?:kg|g|gr|grs|mg|ml|cl|dl|l|lt|litros?|unidades|uds?)`
/** «500 g», «1,5 L», «6 x 33 cl», «6x33cl». */
const CANTIDAD = new RegExp(
  String.raw`(?<![\p{L}\p{N}])\d+(?:[.,]\d+)?\s*(?:x\s*\d+(?:[.,]\d+)?\s*)?${UNIDADES}(?![\p{L}\p{N}])\.?`,
  'giu',
)

function escaparRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
}

/** true si casi todas las letras están en mayúsculas («LECHE ENTERA»). */
export function esMayusculas(s: string): boolean {
  const letras = s.replace(/[^\p{L}]/gu, '')
  if (letras.length < 4) return false
  const mayus = letras.replace(/[^\p{Lu}]/gu, '')
  return mayus.length / letras.length >= 0.7
}

/**
 * Nombre de producto legible: sin cantidad («500 g»), sin la marca repetida (al principio o al final), sin
 * espacios ni separadores sobrantes y con frase (no TODO MAYÚSCULAS ni todo minúsculas). Devuelve `''` si no
 * queda nada útil. No corta: la longitud la decide quien llama (`NOMBRE_MAX`).
 */
export function normalizarNombre(nombre: string, marca: string): string {
  let n = decodificarEntidades(nombre).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(CANTIDAD, ' ')
  n = n.replace(/\s+/g, ' ').trim()
  if (marca) {
    const m = escaparRegex(marca.trim())
    const sep = String.raw`[\s\-–—:,.;/|]*`
    const inicio = new RegExp(String.raw`^${m}(?![\p{L}\p{N}])${sep}`, 'iu')
    const fin = new RegExp(String.raw`${sep}(?<![\p{L}\p{N}])${m}[\s)]*$`, 'iu')
    const sinInicio = n.replace(inicio, '')
    if (sinInicio.trim() !== '') n = sinInicio
    const sinFin = n.replace(fin, '')
    if (sinFin.trim() !== '') n = sinFin
    if (normalizar(n) === normalizar(marca)) return ''
  }
  n = n
    .replace(/\(\s*\)/g, '')
    .replace(/^[\s\-–—:,.;/|()]+|[\s\-–—:,.;/|(]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (esMayusculas(n)) n = n.toLocaleLowerCase('es')
  return n.charAt(0).toLocaleUpperCase('es') + n.slice(1)
}

/** Máximo de caracteres de un nombre: más largo casi siempre es basura (listas de ingredientes, descripciones). */
export const NOMBRE_MAX = 80

/**
 * OFF no dice en qué idioma está el nombre. Heurística barata para quedarse con los españoles: se descartan
 * los que llevan letras que el español no usa (acentos graves, diéresis salvo la «ü», ç, ß, œ, alfabetos con otras letras…) o palabras
 * sueltas inequívocas de otros idiomas (alemán, francés, italiano, portugués). No es un detector de idioma:
 * deja pasar nombres ambiguos («Yogurt», «Cheese») y marcas en inglés.
 */
const LETRAS_ESPANOLAS = 'abcdefghijklmnopqrstuvwxyzáéíóúüñ'
const PALABRAS_NO_ESPANOLAS = /(?<![\p{L}\p{N}])(mit|und|ohne|au|aux|et|sans|avec|alla|della|delle|di|il|le|les|des|du|sem|com|não|erdbeere|mirtillo|fromage)(?![\p{L}\p{N}])/iu

/** true si el nombre parece estar en otro idioma (ver `LETRAS_ESPANOLAS`). */
export function pareceOtroIdioma(nombre: string): boolean {
  for (const ch of nombre.toLowerCase()) {
    if (ch >= 'a' && ch <= 'z') continue
    if (/\p{L}/u.test(ch) && !LETRAS_ESPANOLAS.includes(ch)) return true
  }
  return PALABRAS_NO_ESPANOLAS.test(nombre)
}

const NOMBRES_BASURA =/^(producto|product|sin nombre|unknown|desconocido|test|prueba|xxx+|n\/a|null|none)$/i

// ───────────────────────── Categorías ─────────────────────────

/** Categorías de OFF que se excluyen del paquete (no son alimentos habituales de un adulto o no son comida). */
const EXCLUIDAS = new Set([
  'baby-foods',
  'baby-milks',
  'infant-formulas',
  'follow-on-milk',
  'growing-up-milks',
  'baby-cereals',
  'baby-biscuits',
  'baby-drinks',
  'dietary-supplements',
  'food-supplements',
  'vitamins',
  'sports-nutrition',
  'protein-powders',
  'meal-replacements',
  'weight-loss-products',
  'pet-foods',
  'animal-feeds',
  'cat-foods',
  'dog-foods',
  'nutritional-supplements',
  'nutrition-supplements',
  'infant-cereals',
  'baby-purees',
  'baby-meals',
])

/** Etiquetas de `categories_tags` sin el prefijo de idioma (`en:milks` → `milks`). */
export function etiquetasCategoria(campo: string): string[] {
  return campo
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => t.replace(/^[a-z]{2}:/, ''))
}

export function esExcluida(etiquetas: string[]): boolean {
  return etiquetas.some((t) => EXCLUIDAS.has(t) || /^(baby|infant)-/.test(t))
}

// ───────────────────────── Cantidad (g / ml) ─────────────────────────

const VOLUMEN = /(?<![\p{L}\p{N}])\d+(?:[.,]\d+)?\s*(?:x\s*\d+(?:[.,]\d+)?\s*)?(?:ml|cl|dl|l|lt|litros?)(?![\p{L}\p{N}])/iu
const MASA = /(?<![\p{L}\p{N}])\d+(?:[.,]\d+)?\s*(?:x\s*\d+(?:[.,]\d+)?\s*)?(?:g|gr|grs|kg|mg)(?![\p{L}\p{N}])/iu

/** true si `quantity` está en volumen (ml, cl, l) y no en masa: los valores son por 100 ml. */
export function esVolumen(cantidad: string): boolean {
  return VOLUMEN.test(cantidad) && !MASA.test(cantidad)
}

// ───────────────────────── Línea → producto ─────────────────────────

export interface ProductoOffNormalizado {
  /** GTIN-13: es el `idExterno` y el código de barras. */
  gtin: string
  nombre: string
  marca: string
  categoria: CategoriaAppfit
  kcal: number
  prot: number
  carb: number
  grasa: number
  nutrientes: Partial<Record<'fibra' | 'azucares' | 'sal' | 'agSat', number>>
  ml: boolean
  /** `unique_scans_n`: sirve para elegir los más populares y para desempatar duplicados. */
  escaneos: number
}

export type ResultadoLinea =
  /** No es de España: ni siquiera se cuenta. */
  | undefined
  | { ok: ProductoOffNormalizado }
  | { excluido: string; detalle?: string }

const CATEGORIAS_BEBIDA = new Set<string>(['Bebidas', 'Bebidas alcohólicas', 'Bebidas vegetales'])
const KCAL_MAX_BEBIDA = 350
const KJ_POR_KCAL = 4.184
/** g de etanol por ml por cada % vol (densidad 0,789). */
const G_ALCOHOL_POR_PORCIENTO = 0.789

function redondear1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Número finito de un campo, `undefined` si está vacío o no es número. */
function numero(campo: string | undefined): number | undefined {
  if (campo === undefined || campo.trim() === '') return undefined
  const n = Number(campo.trim().replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

/** Primera marca de `brands` (separadas por comas), sin espacios. */
export function primeraMarca(brands: string): string {
  return brands.split(',')[0].trim()
}

export interface OpcionesLinea {
  /** Si se pasa, se anota aquí el hallazgo de calidad que excluyó el producto (para el informe). */
  hallazgos?: Hallazgo[]
}

/**
 * Procesa una línea del volcado (TSV, ya dividida en `campos`). Devuelve `undefined` si el producto no se
 * vende en España, `{ ok }` si pasa todos los filtros o `{ excluido: motivo }` si no.
 */
export function procesarCampos(campos: string[], idx: IndicesOff, opciones: OpcionesLinea = {}): ResultadoLinea {
  const c = (k: ColumnaOff): string => campos[idx[k]] ?? ''
  if (!c('countries_tags').split(',').includes('en:spain')) return undefined

  // OFF no trae el idioma del producto. La etiqueta `top-country-es-scans-AAAA` de `popularity_tags` dice que
  // España es el país donde más se escanea: lo mejor que hay para quedarse con etiquetas en español y
  // productos que de verdad se compran aquí (una ficha con «en:spain» puede ser de Lidl Alemania).
  if (!/(^|,)top-country-es-scans-\d{4}(,|$)/.test(c('popularity_tags'))) return { excluido: 'no-es-mercado-principal-espana' }

  const gtin = normalizarGtin(/^\d+$/.test(c('code').trim()) ? c('code').trim() : '')
  if (!gtin) return { excluido: 'codigo-invalido' }

  const marca = primeraMarca(c('brands'))
  if (!marca) return { excluido: 'sin-marca' }
  if (c('product_name').trim() === '') return { excluido: 'sin-nombre' }
  if (c('data_quality_errors_tags').trim() !== '') return { excluido: 'errores-de-calidad-de-off' }

  const etiquetas = etiquetasCategoria(c('categories_tags'))
  if (esExcluida(etiquetas)) return { excluido: 'infantil-o-suplemento' }

  const nombre = normalizarNombre(c('product_name'), marca)
  if (nombre.length < 3 || !/\p{L}{2}/u.test(nombre) || NOMBRES_BASURA.test(nombre) || /\p{Extended_Pictographic}/u.test(nombre)) return { excluido: 'nombre-invalido' }
  if (nombre.length > NOMBRE_MAX) return { excluido: 'nombre-demasiado-largo' }
  if (pareceOtroIdioma(nombre)) return { excluido: 'nombre-en-otro-idioma' }
  // Nombres que en realidad son un dato nutricional mal puesto («69 kcal»).
  if (/(?<![\p{L}\p{N}])(kcal|kj|calorias)(?![\p{L}\p{N}])/iu.test(nombre)) return { excluido: 'nombre-invalido' }

  const kcalDirecta = numero(c('energy-kcal_100g'))
  const kj = numero(c('energy-kj_100g')) ?? numero(c('energy_100g'))
  const kcal = kcalDirecta ?? (kj === undefined ? undefined : kj / KJ_POR_KCAL)
  const prot = numero(c('proteins_100g'))
  const carb = numero(c('carbohydrates_100g'))
  const grasa = numero(c('fat_100g'))
  if (kcal === undefined || prot === undefined || carb === undefined || grasa === undefined) {
    return { excluido: 'sin-nutrientes-basicos' }
  }

  const ml = esVolumen(c('quantity'))
  const nutrientes: ProductoOffNormalizado['nutrientes'] = {}
  for (const [clave, col] of [
    ['fibra', 'fiber_100g'],
    ['azucares', 'sugars_100g'],
    ['sal', 'salt_100g'],
    ['agSat', 'saturated-fat_100g'],
  ] as const) {
    const v = numero(c(col))
    if (v !== undefined) nutrientes[clave] = redondear1(v)
  }

  const alcoholVol = numero(c('alcohol_100g'))
  const candidato: AlimentoCalidad = {
    id: `offes:${gtin}`,
    nombre,
    marca,
    kcal: redondear1(kcal),
    prot: redondear1(prot),
    carb: redondear1(carb),
    grasa: redondear1(grasa),
    ...nutrientes,
    ...(alcoholVol !== undefined && alcoholVol > 0 ? { alcohol: alcoholVol * G_ALCOHOL_POR_PORCIENTO } : {}),
    ...(ml ? { ml: true } : {}),
  }
  // Política de OFF: cualquier error o aviso excluye el producto.
  const calidad = validarAlimento(candidato, 'marca')
  const problema = calidad.errores[0] ?? calidad.avisos[0]
  if (problema) {
    opciones.hallazgos?.push(problema)
    return { excluido: `calidad:${problema.regla}`, detalle: problema.detalle }
  }

  const categoria = categoriaDeOff(etiquetas, c('pnns_groups_2'), nombre)
  // Una bebida con más de ~350 kcal/100 ml no existe (el whisky tiene ~230): es un dato en kJ o mal puesto.
  if (CATEGORIAS_BEBIDA.has(categoria) && candidato.kcal > KCAL_MAX_BEBIDA) {
    opciones.hallazgos?.push({ id: candidato.id, nombre, regla: 'bebida-con-energia-imposible', detalle: `${candidato.kcal} kcal/100 ml` })
    return { excluido: 'calidad:bebida-con-energia-imposible', detalle: `${candidato.kcal} kcal/100 ml` }
  }

  return {
    ok: {
      gtin,
      nombre,
      marca,
      categoria,
      kcal: candidato.kcal,
      prot: candidato.prot,
      carb: candidato.carb,
      grasa: candidato.grasa,
      nutrientes,
      ml,
      escaneos: numero(c('unique_scans_n')) ?? 0,
    },
  }
}

/** Como `procesarCampos`, partiendo de la línea TSV completa. Descarta rápido lo que no menciona a España. */
export function procesarLinea(linea: string, idx: IndicesOff, opciones: OpcionesLinea = {}): ResultadoLinea {
  if (!linea.includes('en:spain')) return undefined
  return procesarCampos(linea.split('\t'), idx, opciones)
}

// ───────────────────────── Selección y paquete ─────────────────────────

function completitud(p: ProductoOffNormalizado): number {
  return Object.keys(p.nutrientes).length
}

/**
 * Deduplica y se queda con los `max` más escaneados. Duplicado = mismo GTIN o mismo nombre normalizado +
 * marca; gana el más escaneado (luego el más completo, luego el GTIN menor). No fusiona con CIQUAL: un
 * producto de marca no es un genérico (lo resuelve el ranking).
 */
export function seleccionarProductos(
  candidatos: ProductoOffNormalizado[],
  max: number,
  minEscaneos = 0,
): { elegidos: ProductoOffNormalizado[]; duplicados: number } {
  const orden = candidatos.filter((p) => p.escaneos >= minEscaneos).sort(
    (a, b) => b.escaneos - a.escaneos || completitud(b) - completitud(a) || (a.gtin < b.gtin ? -1 : a.gtin > b.gtin ? 1 : 0),
  )
  const gtins = new Set<string>()
  const nombres = new Set<string>()
  const elegidos: ProductoOffNormalizado[] = []
  let duplicados = 0
  for (const p of orden) {
    const clave = `${normalizar(p.nombre)}|${normalizar(p.marca)}`
    if (gtins.has(p.gtin) || nombres.has(clave)) {
      duplicados++
      continue
    }
    gtins.add(p.gtin)
    nombres.add(clave)
    elegidos.push(p)
    if (elegidos.length >= max) break
  }
  return { elegidos, duplicados }
}

/** Producto → fila del paquete (formato 2). `idExterno` = GTIN-13, así que `extra.gtin` no se repite. */
export function aFila(p: ProductoOffNormalizado): Fila {
  const extra: ExtraFila = { marca: p.marca }
  if (p.ml) extra.ml = 1
  return [p.gtin, p.nombre, '', p.categoria, p.kcal, p.prot, p.carb, p.grasa, p.nutrientes, extra]
}

export function construirPaqueteOff(elegidos: ProductoOffNormalizado[], version: string): Paquete {
  // Orden estable por GTIN (paquetes reproducibles, diffs pequeños).
  const filas = elegidos.map(aFila).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  return { formato: 2, fuente: 'offes', version, tipo: 'marca', filas }
}

export const LICENCIA_OFF = 'ODbL 1.0'

export function entradaManifestOff(paquete: Paquete, archivo: string): EntradaManifest {
  return {
    id: 'offes',
    version: paquete.version,
    archivo,
    filas: paquete.filas.length,
    licencia: LICENCIA_OFF,
    atribucion:
      'Contiene datos de Open Food Facts (openfoodfacts.org), disponibles bajo la Open Database License (ODbL). ' +
      'Los contenidos individuales están bajo la Database Contents License (DbCL).',
  }
}

/** Versión del paquete = fecha del volcado, de `off-products-AAAA-MM-DD.csv.gz`. */
export function versionDeVolcado(archivo: string): string | undefined {
  return /^off-products-(\d{4}-\d{2}-\d{2})\.csv\.gz$/.exec(archivo)?.[1]
}
