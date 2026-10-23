import { useLiveQuery } from 'dexie-react-hooks'
import * as workoutsRepo from '../data/workoutsRepo'
import { hitoDeEntrenos, type HitoEntrenos } from '../lib/fichaEntreno'

/** Si el entreno `id` es el nº 10, 25, 50… de los terminados (A23); `null` si no lo es o mientras carga. Solo lee. */
export function useHitoEntrenos(id: number | undefined): HitoEntrenos | null {
  const terminados = useLiveQuery(() => workoutsRepo.terminados(), [])
  return terminados && id !== undefined ? hitoDeEntrenos(terminados, id) : null
}
