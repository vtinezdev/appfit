// Lecturas de la Liga (solo lectura: se usan en useLiveQuery). Se recalcula a partir de los entrenos terminados.
import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings } from '../../../shared/db/settings'
import * as setsRepo from '../../gym/data/setsRepo'
import * as workoutsRepo from '../../gym/data/workoutsRepo'
import { calcularLigas, type LigaEjercicio } from '../lib/liga'

export type EstadoLigas = { visible: false } | { visible: true; ligas: LigaEjercicio[]; porEjercicio: Map<number, LigaEjercicio>; mantener: number[] }

/** La liga de cada ejercicio hasta `hoy`, con las pausas de Ritmo. Con la gamificación oculta no lee nada más. */
export async function leerLigas(hoy: string): Promise<EstadoLigas> {
  const settings = await getSettings()
  if (settings.gamificacionVisible === false) return { visible: false }
  const [workouts, sets] = await Promise.all([workoutsRepo.terminados(), setsRepo.todas()])
  const ligas = calcularLigas({ hoy, workouts, sets, pausas: settings.pausas })
  return { visible: true, ligas, porEjercicio: new Map(ligas.map((l) => [l.exerciseId, l])), mantener: settings.ligaMantener ?? [] }
}

/** `undefined` mientras carga. */
export function useLigas(hoy: string): EstadoLigas | undefined {
  return useLiveQuery(() => leerLigas(hoy), [hoy])
}
