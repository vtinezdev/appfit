// Convierte la respuesta de Open Food Facts (API v2) en un alimento del catálogo. Lógica pura.
// Solo se usan los campos pedidos en `CAMPOS_OFF`; lo que falte es desconocido (nunca se rellena con 0).
import { catalogId, normalizarGtin } from '../../../../shared/db/foodRef'
import type { CatalogFood } from '../../../../shared/db/types'
import { round1 } from '../../../../shared/lib/format'
import { normalizeName, tokenizar } from '../../../../shared/lib/text'
import type { Por100 } from '../alimentos'
import type { ClaveNutriente } from '../catalogo/paquete'

export const FUENTE_OFF = 'off'
/** Los productos de OFF no vienen de un paquete versionado: se guardan tal cual llegan. */
export const VERSION_OFF = 'live'
export const CAMPOS_OFF = 'code,product_name,product_name_es,brands,nutriments'

const KJ_POR_KCAL = 4.184
const TOTAL_NUTRIENTES = 8

/** Nutrientes extra con las mismas claves que CIQUAL. */
const NUTRIENTES_OFF: Record<ClaveNutriente, string> = {
  fibra: 'fiber_100g',
  azucares: 'sugars_100g',
  sal: 'salt_100g',
  agSat: 'saturated-fat_100g',
}

const MACROS_OFF: Record<Exclude<keyof Por100, 'kcal100'>, string> = {
  prot100: 'proteins_100g',
  carb100: 'carbohydrates_100g',
  grasa100: 'fat_100g',
}

export type ProductoOff =
  /** Nombre y los cuatro valores básicos: se guarda en el catálogo y se añade como cualquier alimento. */
  | { tipo: 'completo'; food: CatalogFood }
  /** Faltan el nombre o algún valor básico: se revisa a mano y acaba como alimento propio. */
  | { tipo: 'incompleto'; nombre: string; marca?: string; valores: Partial<Por100> }
  | { tipo: 'no-encontrado' }

function esObjeto(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

/** Número finito y no negativo (OFF a veces manda cifras como texto); si no, desconocido. */
function numero(x: unknown): number | undefined {
  const n = typeof x === 'string' && x.trim() !== '' ? Number(x.replace(',', '.')) : x
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : undefined
}

function texto(x: unknown): string | undefined {
  return typeof x === 'string' && x.trim() !== '' ? x.trim() : undefined
}

/** kcal por 100 g: `energy-kcal_100g`; si no, los kJ (`energy-kj_100g` o `energy_100g`, que OFF da en kJ) / 4,184. */
function kcalDe(n: Record<string, unknown>): number | undefined {
  const kcal = numero(n['energy-kcal_100g'])
  if (kcal !== undefined) return kcal
  const kj = numero(n['energy-kj_100g']) ?? numero(n['energy_100g'])
  return kj === undefined ? undefined : kj / KJ_POR_KCAL
}

/**
 * Mapea la respuesta de `/api/v2/product/{gtin}.json` (o `null` si respondió 404). `gtin` es el código escaneado.
 * Nombre: `product_name_es` y, si no hay, `product_name`. Marca: la primera de `brands`.
 */
export function mapearProducto(respuesta: unknown, gtin: string, importadoAt: number): ProductoOff {
  const codigo = normalizarGtin(gtin)
  if (!codigo || !esObjeto(respuesta) || respuesta.status === 0 || !esObjeto(respuesta.product)) return { tipo: 'no-encontrado' }
  const p = respuesta.product
  const n = esObjeto(p.nutriments) ? p.nutriments : {}
  const nombre = texto(p.product_name_es) ?? texto(p.product_name)
  const marca = texto(p.brands)?.split(',')[0].trim() || undefined

  const valores: Partial<Por100> = {}
  const kcal = kcalDe(n)
  if (kcal !== undefined) valores.kcal100 = round1(kcal)
  for (const [clave, campo] of Object.entries(MACROS_OFF) as [keyof typeof MACROS_OFF, string][]) {
    const v = numero(n[campo])
    if (v !== undefined) valores[clave] = round1(v)
  }

  const { kcal100, prot100, carb100, grasa100 } = valores
  if (!nombre || kcal100 === undefined || prot100 === undefined || carb100 === undefined || grasa100 === undefined) {
    return { tipo: 'incompleto', nombre: nombre ?? '', ...(marca ? { marca } : {}), valores }
  }

  const nutrientes: Record<string, number> = {}
  for (const [clave, campo] of Object.entries(NUTRIENTES_OFF)) {
    const v = numero(n[campo])
    if (v !== undefined) nutrientes[clave] = round1(v)
  }
  const extras = Object.keys(nutrientes).length
  const food: CatalogFood = {
    id: catalogId(FUENTE_OFF, codigo),
    fuente: FUENTE_OFF,
    idExterno: codigo,
    nombre,
    nombreNorm: normalizeName(nombre),
    tok: tokenizar([nombre, marca ?? ''].join(' ')),
    tipo: 'marca',
    gtin: codigo,
    kcal100,
    prot100,
    carb100,
    grasa100,
    completitud: (4 + extras) / TOTAL_NUTRIENTES,
    version: VERSION_OFF,
    importadoAt,
  }
  if (marca) food.marca = marca
  if (extras > 0) food.nutrientes = nutrientes
  return { tipo: 'completo', food }
}
