import { useState } from 'react'
import { GeminiError } from '../../../shared/ai/gemini'
import { getSettings } from '../../../shared/db/settings'
import * as foodsRepo from '../data/foodsRepo'
import { revisarItems, type ItemRevision } from '../lib/alimentos'
import { interpretarComida } from '../lib/prompts/interpretarComida'

export interface EntradaComida {
  texto?: string
  audioBase64?: string
  audioMime?: string
}

export interface ResultadoRevision {
  items: ItemRevision[]
  transcripcion?: string
}

/** Un único flujo para interpretar una comida con IA (texto o audio) y prepararla para la revisión. */
export function useInterpretarComida() {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function interpretar(entrada: EntradaComida): Promise<ResultadoRevision | null> {
    setError(null)
    setCargando(true)
    try {
      const settings = await getSettings()
      const resultado = await interpretarComida({
        apiKey: settings.apiKey,
        modelo: settings.modelo,
        ...entrada,
        alimentosConocidos: await foodsRepo.nombres(),
      })
      const locales = await foodsRepo.buscarPorNombres(resultado.items.map((it) => it.nombre))
      return { items: revisarItems(resultado.items, locales), transcripcion: resultado.transcripcion }
    } catch (e) {
      const generico = entrada.audioBase64 ? 'Error inesperado interpretando el audio.' : 'Error inesperado interpretando la comida.'
      setError(e instanceof GeminiError ? e.message : generico)
      return null
    } finally {
      setCargando(false)
    }
  }

  return { interpretar, cargando, error, setError }
}
