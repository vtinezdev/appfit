// Lecturas de la experiencia (solo lectura: se usan en useLiveQuery). La XP se recalcula a partir del historial completo.
import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings } from '../../../shared/db/settings'
import type { Entry, Exercise, Pausa, PlanSemanal, SetEntry, Workout } from '../../../shared/db/types'
import { startOfWeek } from '../../../shared/lib/dates'
import * as cheatDaysRepo from '../../nutricion/data/cheatDaysRepo'
import * as entriesRepo from '../../nutricion/data/entriesRepo'
import * as exercisesRepo from '../../gym/data/exercisesRepo'
import * as setsRepo from '../../gym/data/setsRepo'
import * as workoutsRepo from '../../gym/data/workoutsRepo'
import { objetivosPorFecha } from '../../perfil/data/objetivosDiaRepo'
import { planDeSemana } from '../../ritmo/lib/plan'
import { calcularExperiencia, type ResultadoExperiencia } from '../lib/experiencia'

/** Primera fecha posible: las entradas se leen desde el principio del historial. */
const DESDE_SIEMPRE = '0000-01-01'

export type EstadoExperiencia =
  | { visible: false }
  | {
    visible: true
    conNutricion: boolean
    /** Plan de la semana actual. */
    plan: PlanSemanal
    resultado: ResultadoExperiencia
    /** Nombre de cada ejercicio por id, para los récords. */
    nombres: Record<number, string>
    pausas: Pausa[]
    /** Lo leído, para quien necesite más que la XP (Vitrina). Las entradas, vacías si la nutrición no cuenta. */
    datos: { workouts: Workout[]; sets: SetEntry[]; exercises: Exercise[]; entries: Entry[] }
  }

/**
 * Lee todo el historial hasta `hoy` y calcula la experiencia (con su Ritmo). Oculta en Ajustes, no lee nada más. Solo
 * lectura: para usar dentro de un liveQuery.
 */
export async function leerExperiencia(hoy: string): Promise<EstadoExperiencia> {
  const settings = await getSettings()
  if (settings.gamificacionVisible === false) return { visible: false }
  const conNutricion = settings.gamificacionConNutricion !== false
  const [workouts, sets, exercises, entries, cheatDays] = await Promise.all([
    workoutsRepo.terminados(),
    setsRepo.todas(),
    exercisesRepo.listar(),
    conNutricion ? entriesRepo.entreFechas(DESDE_SIEMPRE, hoy) : [],
    conNutricion ? cheatDaysRepo.entreFechas(DESDE_SIEMPRE, hoy) : [],
  ])
  const objetivos = conNutricion ? await objetivosPorFecha([...new Set(entries.map((e) => e.fecha))], hoy) : new Map()
  const protObjetivo = new Map([...objetivos].map(([fecha, o]) => [fecha, o.prot]))
  return {
    visible: true,
    conNutricion,
    plan: planDeSemana(settings.planSemanal, startOfWeek(hoy)),
    resultado: calcularExperiencia({ hoy, workouts, sets, entries, protObjetivo, cheatDays: new Set(cheatDays), planes: settings.planSemanal, pausas: settings.pausas, conNutricion }),
    nombres: Object.fromEntries(exercises.map((e) => [e.id, e.nombre])),
    pausas: settings.pausas ?? [],
    datos: { workouts, sets, exercises, entries },
  }
}

/** Experiencia (y Ritmo) de todo el historial hasta `hoy`. `undefined` mientras carga. */
export function useExperiencia(hoy: string): EstadoExperiencia | undefined {
  return useLiveQuery(() => leerExperiencia(hoy), [hoy])
}
