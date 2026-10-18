import type { Agarre, DatosLado, ObjetivoEjercicio, Routine, SetEntry, Workout } from '../../../shared/db/types'
import { CALENTAMIENTOS_MAX, sanearObjetivo, SERIES_MAX } from './objetivos'
import { ordenEjerciciosSesion } from './workout'

/** Lo que se copia de una serie al repetir un entreno: todo menos su identidad, RIR y confirmación (queda sin marcar). */
export type SerieRepetida = Omit<SetEntry, 'id' | 'workoutId' | 'createdAt'>

type Sesion = Pick<Workout, 'ordenEjercicios' | 'ejerciciosOmitidos'>

/**
 * Los ejercicios del entreno en el orden en que se ven en su detalle, solo los que tienen series.
 */
export function ejerciciosDelEntreno(w: Sesion, sets: Pick<SetEntry, 'id' | 'exerciseId' | 'createdAt'>[]): number[] {
  const conSeries = Array.from(new Set([...sets].sort((a, b) => a.createdAt - b.createdAt || a.id - b.id).map(s => s.exerciseId)))
  return ordenEjerciciosSesion([], conSeries, w.ordenEjercicios, w.ejerciciosOmitidos)
}

/**
 * Las series que se hicieron de cada ejercicio, por su orden. Las pendientes (`realizada: false`) no se hicieron y se
 * dejan fuera; si un ejercicio solo tiene pendientes, se conservan todas para no perder el ejercicio.
 */
export function seriesHechas<T extends Pick<SetEntry, 'exerciseId' | 'orden' | 'realizada'>>(sets: T[], exerciseId: number): T[] {
  const del = sets.filter(s => s.exerciseId === exerciseId).sort((a, b) => a.orden - b.orden)
  const hechas = del.filter(s => s.realizada !== false)
  return hechas.length ? hechas : del
}

const sinRir = (lados: Partial<Record<string, DatosLado>> | undefined) =>
  lados && Object.fromEntries(Object.entries(lados).map(([lado, p]) => [lado, { reps: p!.reps, peso: p!.peso }]))

/**
 * Las series de un entreno listas para empezarlo otra vez: mismos ejercicios y orden, calentamientos, reps, carga,
 * ejecución, agarre y técnica de ese día, sin marcar y sin RIR, como las series objetivo de una rutina. La masa corporal pasa a `pesoCorporal`
 * (el último pesaje), o se conserva la de ese día si no hay pesajes.
 */
export function seriesParaRepetir(w: Sesion, sets: SetEntry[], pesoCorporal?: number): SerieRepetida[] {
  const nuevas: SerieRepetida[] = []
  for (const exerciseId of ejerciciosDelEntreno(w, sets)) {
    seriesHechas(sets, exerciseId).forEach((s, orden) => {
      const { id: _id, workoutId: _w, createdAt: _c, rir: _rir, realizada: _r, lados, bajadas, ...resto } = s
      const serie: SerieRepetida = { ...resto, orden }
      if (lados) serie.lados = sinRir(lados)
      if (bajadas) serie.bajadas = bajadas.map(b => ({ ...b, ...(b.lados ? { lados: sinRir(b.lados) } : {}) }))
      if (serie.modoCarga && pesoCorporal !== undefined) serie.pesoCorporal = pesoCorporal
      nuevas.push(serie)
    })
  }
  return nuevas
}

/** Repeticiones de una serie: las de cada lado si se registró por lados. */
function repsDe(s: Pick<SetEntry, 'reps' | 'ejecucion' | 'lados'>): number[] {
  if (s.ejecucion === 'lados') return Object.values(s.lados ?? {}).map(p => p!.reps).filter(r => r > 0)
  return s.reps > 0 ? [s.reps] : []
}

/**
 * Una rutina con lo que se hizo un día: los ejercicios en su orden y, para cada uno, un objetivo con las series
 * efectivas, el rango de repeticiones (de la menor a la mayor de esas series) y sus calentamientos; y el agarre elegido
 * en la sesión. Un ejercicio sin series efectivas con repeticiones queda sin objetivo.
 */
export function rutinaDesdeEntreno(w: Sesion & Pick<Workout, 'ejecucionesEjercicios'>, sets: SetEntry[]): Pick<Routine, 'exerciseIds' | 'objetivos' | 'agarres'> {
  const exerciseIds = ejerciciosDelEntreno(w, sets)
  const objetivos: Record<number, ObjetivoEjercicio> = {}
  const agarres: Record<number, Agarre | null> = {}
  for (const exerciseId of exerciseIds) {
    const hechas = seriesHechas(sets, exerciseId)
    const efectivas = hechas.filter(s => s.tipo !== 'calentamiento')
    const reps = efectivas.flatMap(repsDe)
    const calentamientos = Math.min(CALENTAMIENTOS_MAX, hechas.length - efectivas.length)
    if (reps.length) {
      objetivos[exerciseId] = sanearObjetivo({ series: Math.min(SERIES_MAX, efectivas.length), repsMin: Math.min(...reps), repsMax: Math.max(...reps),
        ...(calentamientos ? { calentamientos } : {}) })
    }
    const agarre = w.ejecucionesEjercicios?.[exerciseId]?.agarre
    if (agarre) agarres[exerciseId] = agarre
  }
  return { exerciseIds,
    ...(Object.keys(objetivos).length ? { objetivos } : {}),
    ...(Object.keys(agarres).length ? { agarres } : {}) }
}
