import type { Exercise, Routine, Workout } from '../../../shared/db/types'

export interface ResumenRutina {
  /** `catalogId` (o ausente) de los cuatro primeros ejercicios, para el mosaico de miniaturas. */
  miniaturas: (string | undefined)[]
  /** Ejercicios que no caben en el mosaico («+N»). */
  resto: number
  /** Suma de las series objetivo; null si ningún ejercicio tiene objetivo. */
  series: number | null
  /** Inicio del último entreno terminado con esta rutina. */
  ultima: number | null
}

/** Lo que enseña cada rutina en la lista: mosaico, series totales y la última vez que se hizo. */
export function resumenRutina(r: Pick<Routine, 'id' | 'exerciseIds' | 'objetivos'>, workouts: Pick<Workout, 'routineId' | 'inicio' | 'fin'>[], ejercicios: Map<number, Pick<Exercise, 'catalogId'>>): ResumenRutina {
  const ids = r.exerciseIds.filter(id => ejercicios.has(id))
  const objetivos = ids.map(id => r.objetivos?.[id]?.series).filter((n): n is number => n !== undefined)
  const hechas = workouts.filter(w => w.routineId === r.id && w.fin !== undefined).map(w => w.inicio)
  return {
    miniaturas: ids.slice(0, 4).map(id => ejercicios.get(id)?.catalogId),
    resto: Math.max(0, ids.length - 4),
    series: objetivos.length ? objetivos.reduce((a, b) => a + b, 0) : null,
    ultima: hechas.length ? Math.max(...hechas) : null,
  }
}

export class ErrorSustitucion extends Error {}

/**
 * La rutina con `a` en el lugar de `de`, que hereda su objetivo (series, reps, descanso). Si `a` ya está en la rutina o
 * `de` no, no hay nada que sustituir.
 */
export function sustituirEnRutina(r: Routine, de: number, a: number): Routine {
  if (de === a) return r
  if (!r.exerciseIds.includes(de)) throw new ErrorSustitucion('Ese ejercicio ya no está en la rutina.')
  if (r.exerciseIds.includes(a)) throw new ErrorSustitucion('Ese ejercicio ya está en la rutina.')
  const objetivo = r.objetivos?.[de]
  const resto = Object.fromEntries(Object.entries(r.objetivos ?? {}).filter(([k]) => Number(k) !== de))
  const objetivos = objetivo ? { ...resto, [a]: objetivo } : resto
  const { objetivos: _anteriores, ...base } = r
  const exerciseIds = r.exerciseIds.map((id) => (id === de ? a : id))
  return Object.keys(objetivos).length ? { ...base, exerciseIds, objetivos } : { ...base, exerciseIds }
}
