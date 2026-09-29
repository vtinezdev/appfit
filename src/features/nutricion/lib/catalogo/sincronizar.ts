// Sincroniza el catálogo local con el paquete publicado en `/catalogo/`: descarga el manifest, y por cada fuente
// cuya versión difiera de la instalada descarga, valida, convierte e importa. Las dependencias se inyectan para
// poder probarlo sin red ni base de datos; al final se exporta la versión cableada que usa la app.
// Todos los `fetch` ocurren fuera de las transacciones (ninguna función de aquí abre una).
import type { CatalogFood, CatalogSource } from '../../../../shared/db/types'
import * as catalogRepo from '../../data/catalogRepo'
import { aCatalogFoods, validarManifest, validarPaquete } from './paquete'

const RUTA = '/catalogo/'

export interface DependenciasSincronizacion {
  /** Descarga y parsea un JSON. `sinCache` fuerza a revalidar con el servidor (para el manifest). */
  fetchJson: (url: string, opciones?: { sinCache?: boolean }) => Promise<unknown>
  fuentesInstaladas: () => Promise<CatalogSource[]>
  importarFuente: (meta: CatalogSource, foods: CatalogFood[]) => Promise<void>
  ahora: () => number
}

export interface FuenteActualizada {
  id: string
  version: string
  filas: number
}

export interface ResultadoSincronizacion {
  /** Fuentes que se han descargado e importado en esta llamada. */
  actualizadas: FuenteActualizada[]
  /** Ids de las fuentes del manifest que ya estaban en la versión publicada. */
  alDia: string[]
}

/**
 * Crea un sincronizador con un cerrojo en memoria: si se llama mientras hay una sincronización en curso
 * (arranque + botón de Ajustes, doble toque) devuelve la misma promesa en lugar de importar dos veces.
 * Solo toca las fuentes que figuran en el manifest.
 */
export function crearSincronizador(deps: DependenciasSincronizacion): () => Promise<ResultadoSincronizacion> {
  let enCurso: Promise<ResultadoSincronizacion> | null = null

  async function sincronizar(): Promise<ResultadoSincronizacion> {
    const manifest = validarManifest(await deps.fetchJson(`${RUTA}manifest.json`, { sinCache: true }))
    const instaladas = new Map((await deps.fuentesInstaladas()).map((f) => [f.id, f.version]))
    const resultado: ResultadoSincronizacion = { actualizadas: [], alDia: [] }

    for (const entrada of manifest.fuentes) {
      if (instaladas.get(entrada.id) === entrada.version) {
        resultado.alDia.push(entrada.id)
        continue
      }
      const paquete = validarPaquete(await deps.fetchJson(`${RUTA}${entrada.archivo}`))
      // Coherencia con el manifest: un paquete cortado o de otra fuente no debe sustituir lo instalado.
      if (paquete.fuente !== entrada.id || paquete.version !== entrada.version) {
        throw new Error(`El paquete «${entrada.archivo}» no coincide con el manifest`)
      }
      if (paquete.filas.length !== entrada.filas) {
        throw new Error(`El paquete «${entrada.archivo}» tiene ${paquete.filas.length} filas y el manifest indica ${entrada.filas}`)
      }
      const importadoAt = deps.ahora()
      const foods = aCatalogFoods(paquete, importadoAt)
      await deps.importarFuente(
        {
          id: entrada.id,
          version: entrada.version,
          importadoAt,
          licencia: entrada.licencia,
          atribucion: entrada.atribucion,
          filas: foods.length,
        },
        foods,
      )
      resultado.actualizadas.push({ id: entrada.id, version: entrada.version, filas: foods.length })
    }
    return resultado
  }

  return () => {
    if (!enCurso) enCurso = sincronizar().finally(() => (enCurso = null))
    return enCurso
  }
}

/** `fetch` real que devuelve JSON o lanza un error legible (red caída, 404, o un HTML de reserva del servidor). */
async function fetchJsonReal(url: string, opciones?: { sinCache?: boolean }): Promise<unknown> {
  const res = await fetch(url, opciones?.sinCache ? { cache: 'no-cache' } : undefined)
  if (!res.ok) throw new Error(`No se pudo descargar ${url} (${res.status})`)
  try {
    return await res.json()
  } catch {
    throw new Error(`La respuesta de ${url} no es JSON válido`)
  }
}

/** Sincronizador cableado con la red real y `catalogRepo`. Es el que usan el arranque y Ajustes. */
export const sincronizarCatalogo = crearSincronizador({
  fetchJson: fetchJsonReal,
  fuentesInstaladas: catalogRepo.fuentes,
  importarFuente: catalogRepo.importarFuente,
  ahora: Date.now,
})
