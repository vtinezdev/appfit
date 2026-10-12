// Lecturas de Cumbres (solo lectura: se usan en useLiveQuery). Se monta sobre la experiencia: la XP es la que sube.
import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings } from '../../../shared/db/settings'
import type { ConfigCumbres } from '../../../shared/db/types'
import { leerExperiencia, type EstadoExperiencia } from '../../experiencia/hooks/useExperiencia'
import { calcularCumbres, type ResultadoCumbres } from '../lib/cumbres'

export type EstadoCumbres =
  | { visible: false }
  | (Extract<EstadoExperiencia, { visible: true }> & {
    /** `null` hasta elegir la primera montaña. */
    cumbres: ResultadoCumbres | null
    config: ConfigCumbres | undefined
  })

/** Experiencia (con su Ritmo) y Cumbres de todo el historial hasta `hoy`. Solo lectura: para usar dentro de un liveQuery. */
export async function leerCumbres(hoy: string): Promise<EstadoCumbres> {
  const [estado, settings] = await Promise.all([leerExperiencia(hoy), getSettings()])
  if (!estado.visible) return estado
  return { ...estado, cumbres: calcularCumbres(estado.resultado.eventos, settings.cumbres), config: settings.cumbres }
}

/** Cumbres (y la experiencia) hasta `hoy`. `undefined` mientras carga. */
export function useCumbres(hoy: string): EstadoCumbres | undefined {
  return useLiveQuery(() => leerCumbres(hoy), [hoy])
}
