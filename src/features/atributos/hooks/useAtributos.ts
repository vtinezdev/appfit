// Lecturas de Atributos (solo lectura: se usan en useLiveQuery). La XP se recalcula a partir del historial completo.
import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings } from '../../../shared/db/settings'
import type { Entry, Exercise, Pausa, PlanSemanal, SetEntry, Workout } from '../../../shared/db/types'
import { startOfWeek } from '../../../shared/lib/dates'
import * as entriesRepo from '../../nutricion/data/entriesRepo'
import * as exercisesRepo from '../../gym/data/exercisesRepo'
import * as setsRepo from '../../gym/data/setsRepo'
import * as workoutsRepo from '../../gym/data/workoutsRepo'
import { objetivosPorFecha } from '../../perfil/data/objetivosDiaRepo'
import { planDeSemana } from '../../ritmo/lib/plan'
import { calcularAtributos, type ResultadoAtributos } from '../lib/atributos'

/** Primera fecha posible: las entradas se leen desde el principio del historial. */
const DESDE_SIEMPRE = '0000-01-01'

export type EstadoAtributos =
  | { visible: false }
  | {
    visible: true
    conNutricion: boolean
    /** Plan de la semana actual. */
    plan: PlanSemanal
    resultado: ResultadoAtributos
    /** Nombre de cada ejercicio por id, para los récords. */
    nombres: Record<number, string>
    pausas: Pausa[]
    /** Lo leído, para quien necesite más que la XP (Vitrina). Las entradas, vacías si la nutrición no cuenta. */
    datos: { workouts: Workout[]; sets: SetEntry[]; exercises: Exercise[]; entries: Entry[] }
  }

/**
 * Lee todo el historial hasta `hoy` y calcula Atributos (con su Ritmo). Ocultos en Ajustes, no lee nada más. Solo
 * lectura: para usar dentro de un liveQuery.
 */
export async function leerAtributos(hoy: string): Promise<EstadoAtributos> {
  const settings = await getSettings()
  if (settings.gamificacionVisible === false) return { visible: false }
  const conNutricion = settings.gamificacionConNutricion !== false
  const [workouts, sets, exercises, entries] = await Promise.all([
    workoutsRepo.terminados(),
    setsRepo.todas(),
    exercisesRepo.listar(),
    conNutricion ? entriesRepo.entreFechas(DESDE_SIEMPRE, hoy) : [],
  ])
  const objetivos = conNutricion ? await objetivosPorFecha([...new Set(entries.map((e) => e.fecha))], hoy) : new Map()
  const protObjetivo = new Map([...objetivos].map(([fecha, o]) => [fecha, o.prot]))
  return {
    visible: true,
    conNutricion,
    plan: planDeSemana(settings.planSemanal, startOfWeek(hoy)),
    resultado: calcularAtributos({ hoy, workouts, sets, entries, protObjetivo, planes: settings.planSemanal, pausas: settings.pausas, conNutricion }),
    nombres: Object.fromEntries(exercises.map((e) => [e.id, e.nombre])),
    pausas: settings.pausas ?? [],
    datos: { workouts, sets, exercises, entries },
  }
}

/** Atributos (y Ritmo) de todo el historial hasta `hoy`. `undefined` mientras carga. */
export function useAtributos(hoy: string): EstadoAtributos | undefined {
  return useLiveQuery(() => leerAtributos(hoy), [hoy])
}
