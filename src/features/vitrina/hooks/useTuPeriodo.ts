// Lecturas de «Tu mes» / «Tu año» (B15). Solo lectura: se usan en useLiveQuery.
import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings } from '../../../shared/db/settings'
import * as actividadesRepo from '../../actividades/data/actividadesRepo'
import * as exercisesRepo from '../../gym/data/exercisesRepo'
import * as setsRepo from '../../gym/data/setsRepo'
import * as workoutsRepo from '../../gym/data/workoutsRepo'
import * as entriesRepo from '../../nutricion/data/entriesRepo'
import * as cheatDaysRepo from '../../nutricion/data/cheatDaysRepo'
import * as foodsRepo from '../../nutricion/data/foodsRepo'
import { objetivosPorFecha } from '../../perfil/data/objetivosDiaRepo'
import type { Actividad, Objetivos } from '../../../shared/db/types'
import { periodoAResumir, type DatosPeriodo, type Periodo } from '../lib/tuPeriodo'

/** El periodo que toca hoy en Inicio (del 1 al 7 y sin cerrar), o `null`. `undefined` mientras carga. */
export function usePeriodoAResumir(hoy: string): { periodo: Periodo; cerradoAntes: string | undefined } | null | undefined {
  return useLiveQuery(async () => {
    const { resumenMesCerrado } = await getSettings()
    const periodo = periodoAResumir(hoy, resumenMesCerrado)
    return periodo ? { periodo, cerradoAntes: resumenMesCerrado } : null
  }, [hoy])
}

export type DatosPeriodoLeidos = Omit<DatosPeriodo, 'tramos' | 'actividades'> & {
  actividades: Actividad[]
  /** El objetivo de cada día con comidas (su snapshot o los vigentes de hoy). */
  objetivos: Map<string, Objetivos>
  cheatDays: Set<string>
}

/** Los datos del periodo (sin Cumbres, Caminos ni logros, que llegan del lector compartido). */
export function useDatosPeriodo(p: Periodo | null, hoy: string): DatosPeriodoLeidos | undefined {
  return useLiveQuery(async () => {
    if (!p) return undefined
    const [workouts, sets, exercises, actividades, entries, cheatDays] = await Promise.all([
      workoutsRepo.listar(), setsRepo.todas(), exercisesRepo.listar(), actividadesRepo.entreFechas(p.desde, p.hasta), entriesRepo.entreFechas(p.desde, p.hasta),
      cheatDaysRepo.entreFechas(p.desde, p.hasta),
    ])
    const fechas = [...new Set(entries.map((e) => e.fecha))].sort()
    const [categorias, objetivos] = await Promise.all([foodsRepo.categoriasDeEntradas(entries), objetivosPorFecha(fechas, hoy)])
    return { workouts, sets, exercises, actividades, entries, categorias, objetivos, cheatDays: new Set(cheatDays) }
  }, [p?.clave, hoy])
}
