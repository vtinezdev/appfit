// Busca un producto por su código de barras: primero en el dispositivo (productos ya escaneados, que funcionan
// sin conexión) y, si no está, en Open Food Facts. Solo se envía el código de barras.
// Las dependencias se inyectan para probarlo sin red ni base de datos; al final, la versión cableada.
// El `fetch` ocurre fuera de cualquier transacción: `guardar` abre la suya después, con los datos ya descargados.
import { normalizarGtin } from '../../../../shared/db/foodRef'
import type { CatalogFood } from '../../../../shared/db/types'
import * as catalogRepo from '../../data/catalogRepo'
import type { Por100 } from '../alimentos'
import { CAMPOS_OFF, FUENTE_OFF, mapearProducto } from './mapearProducto'

export const ESPERA_MAXIMA_MS = 10_000

export type ResultadoProducto =
  | { tipo: 'encontrado'; food: CatalogFood }
  | { tipo: 'incompleto'; gtin: string; nombre: string; marca?: string; valores: Partial<Por100> }
  | { tipo: 'no-encontrado'; gtin: string }
  | { tipo: 'codigo-invalido' }
  | { tipo: 'error'; mensaje: string }

export interface DependenciasProducto {
  buscarEnDispositivo: (gtin: string) => Promise<CatalogFood[]>
  /** JSON de OFF para ese código, o `null` si OFF no lo conoce (404). Lanza si falla la red. */
  descargar: (gtin: string) => Promise<unknown>
  guardar: (food: CatalogFood) => Promise<void>
  ahora: () => number
  enLinea: () => boolean
}

/** Mensaje de error que dice qué hacer. */
export function mensajeErrorOff(e: unknown, enLinea: boolean): string {
  if (!enLinea) return 'Sin conexión, y este producto no está guardado en el dispositivo. Escribe los valores a mano o inténtalo con internet.'
  if (e instanceof DOMException && (e.name === 'AbortError' || e.name === 'TimeoutError')) {
    return 'Open Food Facts no responde. Inténtalo de nuevo en un momento.'
  }
  return 'No se pudo consultar Open Food Facts. Inténtalo de nuevo más tarde.'
}

export function crearBuscadorProducto(deps: DependenciasProducto): (codigo: string) => Promise<ResultadoProducto> {
  return async (codigo) => {
    const gtin = normalizarGtin(codigo)
    if (!gtin) return { tipo: 'codigo-invalido' }
    try {
      const guardados = await deps.buscarEnDispositivo(gtin)
      // Si hay varios con el mismo código (otra fuente también lo trae), primero el de OFF.
      const enDispositivo = guardados.find((f) => f.fuente === FUENTE_OFF) ?? guardados[0]
      if (enDispositivo) return { tipo: 'encontrado', food: enDispositivo }

      const producto = mapearProducto(await deps.descargar(gtin), gtin, deps.ahora())
      switch (producto.tipo) {
        case 'completo':
          await deps.guardar(producto.food)
          return { tipo: 'encontrado', food: producto.food }
        case 'incompleto':
          return { tipo: 'incompleto', gtin, nombre: producto.nombre, ...(producto.marca ? { marca: producto.marca } : {}), valores: producto.valores }
        case 'no-encontrado':
          return { tipo: 'no-encontrado', gtin }
      }
    } catch (e) {
      return { tipo: 'error', mensaje: mensajeErrorOff(e, deps.enLinea()) }
    }
  }
}

/** Consulta real a OFF con tiempo máximo: `null` si el producto no existe, JSON si sí; lanza si falla la red. */
async function descargarOff(gtin: string): Promise<unknown> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${gtin}.json?fields=${CAMPOS_OFF}`
  const res = await fetch(url, { signal: AbortSignal.timeout(ESPERA_MAXIMA_MS) })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Open Food Facts respondió ${res.status}`)
  return res.json()
}

/** Buscador cableado con la red real y `catalogRepo`. */
export const buscarProducto = crearBuscadorProducto({
  buscarEnDispositivo: catalogRepo.buscarPorGtin,
  descargar: descargarOff,
  guardar: catalogRepo.guardarProductoOff,
  ahora: Date.now,
  enLinea: () => navigator.onLine,
})
