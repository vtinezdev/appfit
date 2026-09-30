import { useEffect, useRef, useState } from 'react'
import { elegibleDeCatalogo, type AlimentoElegible } from '../lib/alimentos'
import { buscarCatalogo } from './buscarCatalogo'

const ESPERA_MS = 150

export interface BusquedaCatalogo {
  /** Resultados ordenados de la última búsqueda terminada (se mantienen mientras llega la siguiente). */
  alimentos: AlimentoElegible[]
  /** true mientras la consulta actual todavía no tiene respuesta. */
  pendiente: boolean
  /** Si la búsqueda no encontraba nada y se corrigió una errata: el texto corregido («plátano»). */
  corregida?: string
}

/**
 * Busca en el catálogo con una pequeña espera entre teclas y descarta las respuestas que llegan tarde.
 * `frecuentes` son ids de catálogo que el usuario ya ha usado: a igualdad de coincidencia van primero.
 * No usa useLiveQuery: el catálogo no cambia mientras se escribe (ver `catalogRepo`).
 */
export function useBusquedaCatalogo(q: string, limite = 15, frecuentes: readonly string[] = []): BusquedaCatalogo {
  const consulta = q.trim()
  const [ultima, setUltima] = useState<{ consulta: string; alimentos: AlimentoElegible[]; corregida?: string } | null>(null)
  // Los frecuentes llegan de una consulta viva y su identidad cambia en cada render: se lee de una ref y solo
  // su contenido (`claveFrecuentes`) relanza la búsqueda.
  const frecuentesRef = useRef(frecuentes)
  frecuentesRef.current = frecuentes
  const claveFrecuentes = frecuentes.join('|')

  useEffect(() => {
    if (!consulta) return
    let vigente = true
    const temporizador = setTimeout(async () => {
      let alimentos: AlimentoElegible[] = []
      let corregida: string | undefined
      try {
        const r = await buscarCatalogo(consulta, new Set(frecuentesRef.current))
        alimentos = r.foods.slice(0, limite).map(elegibleDeCatalogo)
        corregida = r.corregida
      } catch {
        // Si la búsqueda falla, el catálogo se muestra vacío; tus alimentos siguen funcionando.
      }
      if (vigente) setUltima({ consulta, alimentos, corregida })
    }, ESPERA_MS)
    return () => {
      vigente = false
      clearTimeout(temporizador)
    }
  }, [consulta, limite, claveFrecuentes])

  if (!consulta) return { alimentos: [], pendiente: false }
  return { alimentos: ultima?.alimentos ?? [], pendiente: ultima?.consulta !== consulta, corregida: ultima?.consulta === consulta ? ultima.corregida : undefined }
}
