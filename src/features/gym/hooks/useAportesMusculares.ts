import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings } from '../../../shared/db/settings'
import * as exercisesRepo from '../data/exercisesRepo'
import * as setsRepo from '../data/setsRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import { aportesMusculares } from '../lib/progresoMuscular'

/** Series de cada músculo en los entrenos terminados y las pausas de Ritmo (mapa de progreso, ADR 051). Solo lee; `undefined` mientras carga. */
export function useAportesMusculares() {
  return useLiveQuery(async () => {
    const [workouts, sets, exercises, settings] = await Promise.all([workoutsRepo.terminados(), setsRepo.todas(), exercisesRepo.listar(), getSettings()])
    return { ...aportesMusculares(workouts, sets, exercises), pausas: settings.pausas }
  }, [])
}
