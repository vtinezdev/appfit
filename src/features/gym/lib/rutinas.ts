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
