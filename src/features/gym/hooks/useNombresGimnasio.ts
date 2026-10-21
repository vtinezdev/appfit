import { useLiveQuery } from 'dexie-react-hooks'
import * as gimnasiosRepo from '../data/gimnasiosRepo'
import { nombresGimnasios, textoGimnasio } from '../lib/gimnasios'

/**
 * Nombre de cada gimnasio para la interfaz, con el del habitual si se le puso (ADR 054). Mientras carga, los genéricos
 * («Gimnasio habitual», «Otro gimnasio»). Solo lectura.
 */
export function useNombresGimnasio(): (id: number | undefined) => string {
  const datos = useLiveQuery(async () => ({ nombres: nombresGimnasios(await gimnasiosRepo.listar()), habitual: await gimnasiosRepo.nombreHabitual() }), [])
  return id => textoGimnasio(id, datos?.nombres, datos?.habitual)
}
