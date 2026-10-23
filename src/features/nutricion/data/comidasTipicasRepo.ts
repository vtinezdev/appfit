import { addDays } from '../../../shared/lib/dates'
import type { Comida } from '../../../shared/db/types'
import { comidasTipicas, loDeSiempre as calcularLoDeSiempre, VENTANA_LO_DE_SIEMPRE, VENTANA_TIPICAS } from '../lib/comidasTipicas'
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

/** «Lo de siempre» de `comida` para `fecha` (lectura para Inicio; no escribe). */
export async function loDeSiempre(fecha: string, comida: Comida) {
  return calcularLoDeSiempre(await entriesRepo.entreFechas(addDays(fecha, -VENTANA_LO_DE_SIEMPRE), fecha), fecha, comida)
}

