import { claveRef, refDe, type FoodRef } from '../../../shared/db/foodRef'
import type { CatalogFood, Comida, Entry, Food, FuenteAlimento } from '../../../shared/db/types'
import { addDays } from '../../../shared/lib/dates'
import { round1 } from '../../../shared/lib/format'
import { normalizeName } from '../../../shared/lib/text'

/** Valores nutricionales por 100 g de un alimento. */
export type Por100 = Pick<Food, 'kcal100' | 'prot100' | 'carb100' | 'grasa100'>

/**
 * Un alimento con sus gramos, listo para guardarse. La identidad del alimento es su nombre normalizado:
 * si existe uno con ese nombre se reutiliza; si no, se crea con `fuenteSiNuevo`.
 * Con `catalogId`, la entrada referencia ese alimento del catálogo y no se crea ni se toca ningún alimento propio.
 */
export interface ItemGuardado extends Por100 {
  nombre: string
  gramos: number
  fuenteSiNuevo: FuenteAlimento
  catalogId?: string
}

/** De dónde salieron los valores de un ítem de la revisión, para saber después si el usuario los ha cambiado. */
export interface OrigenItem {
  fuente: FuenteAlimento
  valores: Por100
  nombreNorm: string
  /** true si los valores vienen de un alimento ya guardado en «Alimentos». */
  guardado: boolean
  /**
   * Si los valores vienen del catálogo, su id. Entonces `fuente` es `manual` y `guardado` false: si el usuario
   * cambia el nombre o los valores, se guarda como alimento propio `manual` (ver `aItemGuardado`).
   */
  catalogId?: string
  /** Otros alimentos que también encajaban (intérprete local), para «Cambiar». */
  alternativas?: AlimentoElegible[]
}

/** Un alimento en la pantalla de revisión (editable antes de guardar). */
export interface ItemRevision extends Por100 {
  nombre: string
  gramos: number
  origen: OrigenItem
  /** Los gramos son una suposición (no se dijo la cantidad y no hay peso por unidad para ese alimento). */
  gramosEstimados?: boolean
  /** No se encontró el alimento: los valores están a 0 hasta que se elija uno o se escriban. */
  sinCoincidencia?: boolean
  /** Producto escaneado al que le faltan datos (nombre o algún valor): se completan a mano. */
  datosIncompletos?: boolean
}

function valoresDe(p: Por100): Por100 {
  return { kcal100: p.kcal100, prot100: p.prot100, carb100: p.carb100, grasa100: p.grasa100 }
}

/** Compara dos juegos de valores por 100 g con una tolerancia de 0,05 (los inputs redondean a 1 decimal). */
export function mismosValores(a: Por100, b: Por100): boolean {
  return (['kcal100', 'prot100', 'carb100', 'grasa100'] as const).every((k) => Math.abs(a[k] - b[k]) < 0.05)
}

/** Valores por 100 g reconstruidos a partir del snapshot de una entrada (con 0 g, todo a 0). */
export function por100DesdeEntrada(e: Pick<Entry, 'gramos' | 'kcal' | 'prot' | 'carb' | 'grasa'>): Por100 {
  return {
    kcal100: round1((e.kcal / e.gramos) * 100),
    prot100: round1((e.prot / e.gramos) * 100),
    carb100: round1((e.carb / e.gramos) * 100),
    grasa100: round1((e.grasa / e.gramos) * 100),
  }
}

/**
 * Qué hacer con el alimento al guardar un ítem:
 * - `crear`: no existe ninguno con ese nombre.
 * - `reutilizar`: existe y los valores coinciden; no se toca (ni su procedencia).
 * - `actualizar`: existe y el usuario ha cambiado los valores; se corrigen y pasa a `manual`.
 */
export function decidirGuardado(existente: Food | undefined, item: Por100): 'crear' | 'reutilizar' | 'actualizar' {
  if (!existente) return 'crear'
  return mismosValores(existente, item) ? 'reutilizar' : 'actualizar'
}

/**
 * Prepara los alimentos que devuelve la IA para la revisión: si un alimento ya está guardado,
 * se usan su nombre y sus valores locales (los del usuario tienen prioridad sobre la estimación).
 * `locales` va indexado por nombre normalizado.
 */
export function revisarItems(items: (Por100 & { nombre: string; gramos: number })[], locales: Map<string, Food>): ItemRevision[] {
  return items.map((it) => {
    const local = locales.get(normalizeName(it.nombre))
    if (!local) {
      return {
        nombre: it.nombre,
        gramos: it.gramos,
        ...valoresDe(it),
        origen: { fuente: 'gemini', valores: valoresDe(it), nombreNorm: normalizeName(it.nombre), guardado: false },
      }
    }
    return {
      nombre: local.nombre,
      gramos: it.gramos,
      ...valoresDe(local),
      origen: { fuente: local.fuente, valores: valoresDe(local), nombreNorm: local.nombreNorm, guardado: true },
    }
  })
}

/** true si el ítem sigue siendo tal cual el alimento del catálogo del que salió (mismo nombre y valores). */
function sigueSiendoDelCatalogo(item: ItemRevision): boolean {
  return item.origen.catalogId !== undefined && normalizeName(item.nombre) === item.origen.nombreNorm && mismosValores(item, item.origen.valores)
}

/**
 * Convierte un ítem revisado en lo que se guarda: si el usuario cambió los valores, un alimento nuevo será `manual`.
 * Un ítem del catálogo sin cambios se guarda con su `catalogId` (sin crear alimento propio).
 */
export function aItemGuardado(item: ItemRevision): ItemGuardado {
  const guardado: ItemGuardado = {
    nombre: item.nombre.trim(),
    gramos: item.gramos,
    ...valoresDe(item),
    fuenteSiNuevo: mismosValores(item, item.origen.valores) ? item.origen.fuente : 'manual',
  }
  if (sigueSiendoDelCatalogo(item)) guardado.catalogId = item.origen.catalogId
  return guardado
}

/**
 * Ítem de la revisión a partir de un alimento elegido (intérprete local o «Cambiar»). Uno propio cuenta como
 * guardado; uno del catálogo lleva su `catalogId` (ver `OrigenItem`).
 */
export function itemDesdeElegible(a: AlimentoElegible, gramos: number, extra: Pick<ItemRevision, 'gramosEstimados'> & { alternativas?: AlimentoElegible[] } = {}): ItemRevision {
  const valores = valoresDe(a)
  const origen: OrigenItem = { fuente: 'manual', valores, nombreNorm: normalizeName(a.nombre), guardado: a.ref.tipo === 'user' }
  if (a.ref.tipo === 'catalog') origen.catalogId = a.ref.id
  if (extra.alternativas && extra.alternativas.length > 0) origen.alternativas = extra.alternativas
  const item: ItemRevision = { nombre: a.nombre, gramos, ...valores, origen }
  if (extra.gramosEstimados) item.gramosEstimados = true
  return item
}

/** Ítem de un alimento que no se ha encontrado: valores a 0 para que el usuario elija uno o los escriba. */
export function itemSinCoincidencia(nombre: string, gramos: number, extra: Pick<ItemRevision, 'gramosEstimados'> & { alternativas?: AlimentoElegible[] } = {}): ItemRevision {
  const valores: Por100 = { kcal100: 0, prot100: 0, carb100: 0, grasa100: 0 }
  const origen: OrigenItem = { fuente: 'manual', valores, nombreNorm: normalizeName(nombre), guardado: false }
  if (extra.alternativas && extra.alternativas.length > 0) origen.alternativas = extra.alternativas
  const item: ItemRevision = { nombre, gramos, ...valores, origen, sinCoincidencia: true }
  if (extra.gramosEstimados) item.gramosEstimados = true
  return item
}

/**
 * Ítem de un producto escaneado con datos incompletos: lo que se conoce y 0 en lo demás. Se guarda como alimento
 * propio `manual` (nunca con `catalogId`: el producto incompleto no entra en el catálogo).
 */
export function itemDeProductoIncompleto(nombre: string, conocidos: Partial<Por100>, gramos = 100): ItemRevision {
  const valores: Por100 = { kcal100: 0, prot100: 0, carb100: 0, grasa100: 0, ...conocidos }
  return { nombre, gramos, ...valores, origen: { fuente: 'manual', valores, nombreNorm: normalizeName(nombre), guardado: false }, datosIncompletos: true }
}

/** true si el ítem no se encontró (o le faltan datos) y todavía no tiene ningún valor: no se puede guardar así. */
export function faltanValores(item: ItemRevision): boolean {
  return (item.sinCoincidencia === true || item.datosIncompletos === true) && mismosValores(item, { kcal100: 0, prot100: 0, carb100: 0, grasa100: 0 })
}

/**
 * Qué etiqueta de procedencia mostrar en la revisión: `tuyo` (un alimento de «Alimentos»), `catalogo` (tal cual
 * del catálogo), `estimado` (valores estimados por la IA) o nada (escrito o cambiado por el usuario).
 */
export function procedencia(item: ItemRevision): 'tuyo' | 'catalogo' | 'estimado' | undefined {
  if (item.origen.guardado) return 'tuyo'
  if (item.origen.catalogId !== undefined) return sigueSiendoDelCatalogo(item) ? 'catalogo' : undefined
  if (item.origen.fuente === 'gemini' && mismosValores(item, item.origen.valores)) return 'estimado'
  return undefined
}

/** true si al guardar este ítem se corregirán los valores de un alimento ya guardado (para avisar en la revisión). */
export function actualizaAlimentoGuardado(item: ItemRevision): boolean {
  return item.origen.guardado && normalizeName(item.nombre) === item.origen.nombreNorm && !mismosValores(item, item.origen.valores)
}

/** Días hacia atrás que cuentan para los frecuentes del añadido rápido. */
export const VENTANA_FRECUENTES_DIAS = 60

/**
 * Referencias a alimentos (propios o del catálogo) ordenadas por uso en los últimos `dias`: cada uso en la misma
 * comida (desayuno, cena…) vale 3 puntos y en otra comida, 1. En caso de empate gana el usado más recientemente.
 * Las entradas rápidas o sin alimento no cuentan, y tampoco una entrada que incumpla el invariante de `foodRef`
 * (se ignora en vez de romper la lista).
 */
export function rankFrecuentes(
  entries: Entry[],
  { comida, hoy, dias = VENTANA_FRECUENTES_DIAS }: { comida: Comida; hoy: string; dias?: number },
): FoodRef[] {
  const desde = addDays(hoy, -(dias - 1))
  const stats = new Map<string, { ref: FoodRef; puntos: number; ultimo: number }>()
  for (const e of entries) {
    if (e.rapida || e.fecha < desde || e.fecha > hoy) continue
    let ref: FoodRef | undefined
    try {
      ref = refDe(e)
    } catch {
      continue
    }
    if (!ref) continue
    const clave = claveRef(ref)
    const s = stats.get(clave) ?? { ref, puntos: 0, ultimo: 0 }
    s.puntos += e.comida === comida ? 3 : 1
    s.ultimo = Math.max(s.ultimo, e.createdAt)
    stats.set(clave, s)
  }
  return [...stats.values()].sort((a, b) => b.puntos - a.puntos || b.ultimo - a.ultimo).map((s) => s.ref)
}

/**
 * Un alimento que se puede elegir para añadirlo con sus gramos: uno propio (`foods`) o uno del catálogo.
 * `detalle` es una línea secundaria opcional (la categoría del catálogo o, en un producto, su marca).
 */
export interface AlimentoElegible extends Por100 {
  ref: FoodRef
  nombre: string
  detalle?: string
}

export function elegibleDeFood(f: Food): AlimentoElegible {
  return { ref: { tipo: 'user', id: f.id }, nombre: f.nombre, ...valoresDe(f) }
}

export function elegibleDeCatalogo(f: CatalogFood): AlimentoElegible {
  return { ref: { tipo: 'catalog', id: f.id }, nombre: f.nombre, detalle: f.categoria ?? f.marca, ...valoresDe(f) }
}

/** Formulario de «Kcal rápidas» (A5): una comida fuera que no merece registrarse con detalle. */
export interface KcalRapidasDraft {
  nombre: string
  kcal: number
  prot: number
  carb: number
  grasa: number
}

export const NOMBRE_RAPIDA_POR_DEFECTO = 'Comida fuera'

/**
 * Valida el formulario de «Kcal rápidas»: solo las kcal son obligatorias (> 0); prot/carb/grasa son
 * opcionales (0 por defecto). Devuelve los datos con el nombre ya resuelto (el placeholder si está vacío),
 * o `null` si no son válidos.
 */
export function validarKcalRapidas(draft: KcalRapidasDraft): KcalRapidasDraft | null {
  const { nombre, kcal, prot, carb, grasa } = draft
  if (![kcal, prot, carb, grasa].every((n) => Number.isFinite(n) && n >= 0) || kcal <= 0) return null
  return { nombre: nombre.trim() || NOMBRE_RAPIDA_POR_DEFECTO, kcal, prot, carb, grasa }
}

/**
 * Busca alimentos sin tildes ni mayúsculas: cada palabra de la búsqueda tiene que aparecer en el nombre,
 * en cualquier orden. Primero los que empiezan por la búsqueda y después por orden alfabético.
 */
export function filtrarAlimentos(foods: Food[], q: string, limite = 20): Food[] {
  const tokens = normalizeName(q).split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return []
  const consulta = tokens.join(' ')
  return foods
    .filter((f) => tokens.every((t) => f.nombreNorm.includes(t)))
    .sort(
      (a, b) =>
        Number(b.nombreNorm.startsWith(consulta)) - Number(a.nombreNorm.startsWith(consulta)) || a.nombreNorm.localeCompare(b.nombreNorm),
    )
    .slice(0, limite)
}
