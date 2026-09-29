// Acceso a `catalogFoods` / `catalogSources`. El catálogo es solo lectura desde la app (lo escribe el importador),
// re-descargable y queda fuera del backup. Ninguna función carga la tabla entera para buscar.
// Las lecturas no escriben, pero la búsqueda NO debe ir en un useLiveQuery: el catálogo no cambia entre importaciones.
import { db } from '../../../shared/db/db'
import { normalizarGtin } from '../../../shared/db/foodRef'
import type { CatalogFood, CatalogSource, FuenteCatalogo } from '../../../shared/db/types'
import { normalizeName } from '../../../shared/lib/text'

/**
 * Palabras normalizadas y sin repetir de un texto: los valores del índice `*tok`. Es lo único que se normaliza
 * para buscar (ñ → n, sin tildes, minúsculas): `nombre` y `nombreOriginal` se guardan tal cual para mostrarlos.
 * Separa por lo que no sea letra o número Unicode (así `ß`, `ø` o el griego no desaparecen como separadores).
 */
export function tokenizar(texto: string): string[] {
  return [...new Set(normalizeName(texto).split(/[^\p{L}\p{N}]+/u).filter(Boolean))]
}

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
 *   Si el token guía es muy común y el resto casi nunca coincide, el cursor puede recorrer muchas filas
 *   (memoria constante, pero tiempo proporcional). Se revisará al medir 5.000–10.000 alimentos en WebKit real.
 */
export async function buscar(q: string, limite = 20): Promise<CatalogFood[]> {
  const tokens = tokenizar(q)
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
