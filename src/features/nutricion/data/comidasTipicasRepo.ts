import { addDays } from '../../../shared/lib/dates'
import { comidasTipicas, VENTANA_TIPICAS } from '../lib/comidasTipicas'
import * as entriesRepo from './entriesRepo'
import * as mealsRepo from './mealsRepo'

/** Lectura reactiva del historial reciente y de las comidas guardadas manualmente. */
export async function listar(fecha: string) {
  const [entries, plantillas] = await Promise.all([
    entriesRepo.entreFechas(addDays(fecha, -(VENTANA_TIPICAS - 1)), fecha),
    mealsRepo.listar(),
  ])
  return comidasTipicas({ entries, plantillas, fecha })
}
