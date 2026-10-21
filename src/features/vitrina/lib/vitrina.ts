// Vitrina: logros, muro de récords y colecciones (Herbario y Atlas) de todo el historial. Funciones puras.
import type { Actividad, DiaPasos, Entry, Exercise, Pausa, SetEntry, Workout } from '../../../shared/db/types'
import { startOfWeek, toISODate } from '../../../shared/lib/dates'
import type { ResultadoExperiencia } from '../../experiencia/lib/experiencia'
import type { ResultadoCumbres } from '../../cumbres/lib/cumbres'
import type { ResultadoCaminos } from '../../caminos/lib/caminos'
import { volumenSets } from '../../gym/lib/workout'
import { calcularLigas, primerosCiclos } from '../../liga/lib/liga'
import { herbarioPorSemana, plantasDistintas, type Planta, type SemanaHerbario } from '../../nutricion/lib/herbario'
import { calcularAtlas, type Atlas } from './atlas'
import { calcularLogros, type Logro } from './logros'
import { muroRecords, type MuroEjercicio } from './muro'

export interface DatosVitrina {
  hoy: string
  experiencia: ResultadoExperiencia
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
  /** Cumbres, para sus logros (`null` si aún no se ha elegido la primera montaña). */
  cumbres?: ResultadoCumbres | null
  /** Actividades terminadas y Caminos, para sus logros. */
  actividades?: readonly Actividad[]
  caminos?: ResultadoCaminos | null
  /** Pasos apuntados de cada día, para sus logros. */
  pasos?: readonly Pick<DiaPasos, 'fecha' | 'pasos'>[]
  /** Nombres de los gimnasios, para las marcas de máquinas de otro gimnasio. */
  gimnasios?: ReadonlyMap<number, string>
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
  const ligas = calcularLigas({ hoy: d.hoy, workouts: terminados, sets: d.sets, pausas: d.pausas })
  const volumenes = [...terminados].sort((a, b) => a.inicio - b.inicio)
    .map((w) => ({ fecha: toISODate(new Date(w.inicio)), workoutId: w.id, kg: volumenSets(porWorkout.get(w.id) ?? []) }))
  return {
    logros: calcularLogros({ hoy: d.hoy, experiencia: d.experiencia, atlas, herbario: semanas, plantas: herbario?.desdeSiempre, conNutricion: d.conNutricion,
      cumbres: d.cumbres, actividades: (d.actividades ?? []).filter((x) => !x.enCurso && x.fecha <= d.hoy), caminos: d.caminos, pasos: d.pasos, ligas, volumenes,
      ciclos: primerosCiclos(ligas).map(({ fecha, workoutId }) => ({ fecha, workoutId })) }),
    muro: muroRecords(terminados, d.sets, d.gimnasios),
    atlas,
    herbario,
  }
}
