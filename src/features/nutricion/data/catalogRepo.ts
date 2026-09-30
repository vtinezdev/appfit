// Acceso a `catalogFoods` / `catalogSources`. El catálogo es solo lectura desde la app (lo escribe el importador),
// re-descargable y queda fuera del backup. Ninguna función carga la tabla entera para buscar.
// Las lecturas no escriben, pero la búsqueda NO debe ir en un useLiveQuery: el catálogo no cambia entre importaciones.
import { db } from '../../../shared/db/db'
import { normalizarGtin } from '../../../shared/db/foodRef'
import type { CatalogFood, CatalogSource, FuenteCatalogo } from '../../../shared/db/types'
import { tokensConsulta } from '../../../shared/lib/text'
import { FUENTE_OFF, VERSION_OFF } from '../lib/off/mapearProducto'

export function obtener(id: string): Promise<CatalogFood | undefined> {
  return db.catalogFoods.get(id)
}

/** Varios alimentos del catálogo en una lectura (p. ej. para resolver ítems de plantilla). La clave del mapa es el id. */
export async function porIds(ids: string[]): Promise<Map<string, CatalogFood>> {
  const encontrados = (await db.catalogFoods.bulkGet(ids)).filter((f): f is CatalogFood => f !== undefined)
  return new Map(encontrados.map((f) => [f.id, f]))
}

/** Productos con ese código de barras (puede haber varios: el índice no es único). Vacío si no es un GTIN válido. */
export async function buscarPorGtin(gtin: string): Promise<CatalogFood[]> {
  const norm = normalizarGtin(gtin)
  return norm ? db.catalogFoods.where('gtin').equals(norm).toArray() : []
}

/**
 * Búsqueda por prefijo de palabras. Recorre con un cursor el índice `*tok` solo desde las filas cuya palabra
 * empieza por el token más largo (`startsWith` → rango del índice, no un `toArray()` de la tabla), descarta en el
 * propio cursor las filas repetidas (`distinct()`: un índice multiEntry devuelve la fila una vez por cada palabra
 * que coincide) y las que no cumplen el resto de tokens, y se detiene al reunir `limite` resultados.
 *
 * - Exhaustiva: no hay tope de candidatos, así que un prefijo muy frecuente no oculta coincidencias válidas.
 * - Sin ranking: devuelve las primeras `limite` en el orden del índice (palabra, luego id), no las mejores.
 *   Quien muestra resultados pide candidatos de sobra y los ordena con `rankCatalogo` (lib/catalogo/ranking).
 *   Si el token guía es muy común y el resto casi nunca coincide, el cursor puede recorrer muchas filas
 *   (memoria constante, pero tiempo proporcional). Se revisará al medir 5.000–10.000 alimentos en WebKit real.
 * - Las palabras vacías de la consulta («de», «con»…) no filtran (`tokensConsulta`).
 */
export async function buscar(q: string, limite = 20): Promise<CatalogFood[]> {
  const tokens = tokensConsulta(q)
  if (tokens.length === 0) return []
  const [guia, ...resto] = [...tokens].sort((a, b) => b.length - a.length)
  return db.catalogFoods
    .where('tok')
    .startsWith(guia)
    .distinct()
    .and((f) => resto.every((t) => f.tok.some((w) => w.startsWith(t))))
    .limit(limite)
    .toArray()
}

export function contar(): Promise<number> {
  return db.catalogFoods.count()
}

/**
 * Inserta o reemplaza alimentos del catálogo (idempotente por `id`). Escribe por lotes en transacciones
 * pequeñas para no bloquear ni agotar memoria con paquetes grandes.
 */
export async function guardarLote(foods: CatalogFood[], tamanoLote = 2000): Promise<void> {
  for (let i = 0; i < foods.length; i += tamanoLote) {
    const lote = foods.slice(i, i + tamanoLote)
    await db.transaction('rw', db.catalogFoods, () => db.catalogFoods.bulkPut(lote))
  }
}

/** Borra las filas de una fuente con `version` distinta de la actual (tras reimportar una versión nueva). */
export function borrarVersionesAntiguas(fuente: FuenteCatalogo, versionActual: string): Promise<number> {
  return db.catalogFoods.where('fuente').equals(fuente).and((f) => f.version !== versionActual).delete()
}

export function borrarFuente(fuente: FuenteCatalogo): Promise<void> {
  return db.transaction('rw', db.catalogFoods, db.catalogSources, async () => {
    await db.catalogFoods.where('fuente').equals(fuente).delete()
    await db.catalogSources.delete(fuente)
  })
}

/** Vacía el catálogo entero (y sus metadatos) sin tocar datos del usuario. */
export function borrarCatalogo(): Promise<void> {
  return db.transaction('rw', db.catalogFoods, db.catalogSources, async () => {
    await db.catalogFoods.clear()
    await db.catalogSources.clear()
  })
}

export function fuentes(): Promise<CatalogSource[]> {
  return db.catalogSources.toArray()
}

export function guardarFuente(fuente: CatalogSource): Promise<void> {
  return db.catalogSources.put(fuente).then(() => undefined)
}

/** Licencia y atribución de Open Food Facts (la exige la ODbL). */
export const METADATOS_OFF: Omit<CatalogSource, 'importadoAt' | 'filas'> = {
  id: FUENTE_OFF,
  version: VERSION_OFF,
  licencia: 'ODbL 1.0 (Open Database License)',
  atribucion: 'Datos de Open Food Facts (openfoodfacts.org), con licencia ODbL.',
}

/**
 * Guarda un producto escaneado de Open Food Facts (`fuente: 'off'`) y anota la fuente `off` con el número de
 * productos guardados. Los datos ya vienen descargados: dentro de la transacción no hay red.
 * La sincronización del paquete no toca esta fuente (solo importa las del manifest).
 */
export function guardarProductoOff(food: CatalogFood): Promise<void> {
  if (food.fuente !== FUENTE_OFF) return Promise.reject(new Error(`«${food.id}» no es de Open Food Facts`))
  return db.transaction('rw', db.catalogFoods, db.catalogSources, async () => {
    await db.catalogFoods.put(food)
    const filas = await db.catalogFoods.where('fuente').equals(FUENTE_OFF).count()
    await db.catalogSources.put({ ...METADATOS_OFF, importadoAt: food.importadoAt, filas })
  })
}

/**
 * Instala (o actualiza) una fuente: guarda sus filas, borra las de versiones antiguas y, AL FINAL, anota la fuente.
 * Sin `db.transaction` global a propósito (un paquete grande no cabe en una): `guardarLote` escribe por lotes.
 * El orden hace que una importación interrumpida se reintente sola en el siguiente arranque, porque la fuente
 * aún no consta como instalada, y es idempotente (`bulkPut`). Solo toca filas de `meta.id`.
 */
export async function importarFuente(meta: CatalogSource, foods: CatalogFood[]): Promise<void> {
  if (foods.some((f) => f.fuente !== meta.id)) {
    throw new Error(`Hay alimentos que no son de la fuente «${meta.id}»`)
  }
  await guardarLote(foods)
  await borrarVersionesAntiguas(meta.id, meta.version)
  await guardarFuente(meta)
}
