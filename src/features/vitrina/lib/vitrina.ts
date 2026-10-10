// Vitrina: logros, muro de récords y colecciones (Herbario y Atlas) de todo el historial. Funciones puras.
import type { Entry, Exercise, Pausa, SetEntry, Workout } from '../../../shared/db/types'
import { startOfWeek } from '../../../shared/lib/dates'
import type { ResultadoAtributos } from '../../atributos/lib/atributos'
import { calcularLigas, primerosCiclos } from '../../liga/lib/liga'
import { herbarioPorSemana, plantasDistintas, type Planta, type SemanaHerbario } from '../../nutricion/lib/herbario'
import { calcularAtlas, type Atlas } from './atlas'
import { calcularLogros, type Logro } from './logros'
import { muroRecords, type MuroEjercicio } from './muro'

export interface DatosVitrina {
  hoy: string
  atributos: ResultadoAtributos
  workouts: Workout[]
  sets: SetEntry[]
  exercises: Exercise[]
  /** Vacías si la nutrición no cuenta. */
  entries: Entry[]
  /** Categoría de cada alimento referenciado (`foodsRepo.categoriasDeEntradas`). */
  categorias: ReadonlyMap<string, string>
  conNutricion: boolean
  /** Pausas de Ritmo: congelan la Liga (ciclos completados). */
  pausas?: readonly Pausa[]
}

export interface Herbario {
  semana: Planta[]
  desdeSiempre: Planta[]
  semanas: SemanaHerbario[]
  /** Más plantas distintas en una semana. */
  mejorSemana: SemanaHerbario | null
}

export interface ResultadoVitrina {
  logros: Logro[]
  muro: MuroEjercicio[]
  atlas: Atlas
  /** `null` si la nutrición no cuenta. */
  herbario: Herbario | null
}

export function calcularVitrina(d: DatosVitrina): ResultadoVitrina {
  const porWorkout = new Map<number, SetEntry[]>()
  for (const s of d.sets) {
    const lista = porWorkout.get(s.workoutId)
    if (lista) lista.push(s)
    else porWorkout.set(s.workoutId, [s])
  }
  const terminados = d.workouts.filter((w) => w.fin !== undefined)
  const atlas = calcularAtlas(terminados, porWorkout, d.exercises)
  const lunes = startOfWeek(d.hoy)
  const entries = d.entries.filter((e) => e.fecha <= d.hoy)
  const semanas = d.conNutricion ? herbarioPorSemana(entries, d.categorias) : []
  const herbario: Herbario | null = d.conNutricion ? {
    semana: plantasDistintas(entries.filter((e) => e.fecha >= lunes), d.categorias),
    desdeSiempre: plantasDistintas(entries, d.categorias),
    semanas,
    mejorSemana: semanas.reduce<SemanaHerbario | null>((m, s) => (!m || s.plantas > m.plantas ? s : m), null),
  } : null
  return {
    logros: calcularLogros({ hoy: d.hoy, atributos: d.atributos, atlas, herbario: semanas, conNutricion: d.conNutricion,
      ciclos: primerosCiclos(calcularLigas({ hoy: d.hoy, workouts: terminados, sets: d.sets, pausas: d.pausas })).map(({ fecha, workoutId }) => ({ fecha, workoutId })) }),
    muro: muroRecords(terminados, d.sets),
    atlas,
    herbario,
  }
}
