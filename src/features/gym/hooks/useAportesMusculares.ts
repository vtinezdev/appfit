import { useLiveQuery } from 'dexie-react-hooks'
import * as exercisesRepo from '../data/exercisesRepo'
import * as setsRepo from '../data/setsRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import { aportesMusculares } from '../lib/calorMuscular'

/** Series de cada músculo en los entrenos terminados (mapa acumulado, ADR 046). Solo lee; `undefined` mientras carga. */
export function useAportesMusculares() {
  return useLiveQuery(async () => {
    const [workouts, sets, exercises] = await Promise.all([workoutsRepo.terminados(), setsRepo.todas(), exercisesRepo.listar()])
    return aportesMusculares(workouts, sets, exercises)
  }, [])
}
