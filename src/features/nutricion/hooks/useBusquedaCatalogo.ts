import { useEffect, useState } from 'react'
import * as catalogRepo from '../data/catalogRepo'
import { elegibleDeCatalogo, type AlimentoElegible } from '../lib/alimentos'
import { rankCatalogo } from '../lib/catalogo/ranking'

/**
 * Candidatos que se piden al índice antes de ordenar. `catalogRepo.buscar` los da en el orden del índice, así que
 * hay que pedir de sobra para no perder los buenos: con CIQUAL, el prefijo más común de una búsqueda normal
 * («queso») tiene unas 250 filas.
 */
const CANDIDATOS = 300
const ESPERA_MS = 150

export interface BusquedaCatalogo {
  /** Resultados ordenados de la última búsqueda terminada (se mantienen mientras llega la siguiente). */
  alimentos: AlimentoElegible[]
  /** true mientras la consulta actual todavía no tiene respuesta. */
  pendiente: boolean
}

/**
 * Busca en el catálogo con una pequeña espera entre teclas y descarta las respuestas que llegan tarde.
 * No usa useLiveQuery: el catálogo no cambia mientras se escribe (ver `catalogRepo`).
 */
export function useBusquedaCatalogo(q: string, limite = 15): BusquedaCatalogo {
  const consulta = q.trim()
  const [ultima, setUltima] = useState<{ consulta: string; alimentos: AlimentoElegible[] } | null>(null)

  useEffect(() => {
    if (!consulta) return
    let vigente = true
    const temporizador = setTimeout(async () => {
      let alimentos: AlimentoElegible[] = []
      try {
        alimentos = rankCatalogo(await catalogRepo.buscar(consulta, CANDIDATOS), consulta).slice(0, limite).map(elegibleDeCatalogo)
      } catch {
        // Si la búsqueda falla, el catálogo se muestra vacío; tus alimentos siguen funcionando.
      }
      if (vigente) setUltima({ consulta, alimentos })
    }, ESPERA_MS)
    return () => {
      vigente = false
      clearTimeout(temporizador)
    }
  }, [consulta, limite])

  if (!consulta) return { alimentos: [], pendiente: false }
  return { alimentos: ultima?.alimentos ?? [], pendiente: ultima?.consulta !== consulta }
}
