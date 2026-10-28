import type { ConfiguracionEjecucion, EjecucionRutina, Exercise, Routine, Workout } from '../../../shared/db/types'
import { ejecucionVigente } from './ejecucion'
import { superseriesDe, type Superserie } from './superseries'

export interface ResumenRutina {
  /** `catalogId` (o ausente) de los cuatro primeros ejercicios, para el mosaico de miniaturas. */
  miniaturas: (string | undefined)[]
  /** Ejercicios que no caben en el mosaico («+N»). */
  resto: number
  /** Suma de las series objetivo; null si algún ejercicio no tiene objetivo (la suma engañaría) o no hay ejercicios. */
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
    series: objetivos.length && objetivos.length === ids.length ? objetivos.reduce((a, b) => a + b, 0) : null,
    ultima: hechas.length ? Math.max(...hechas) : null,
  }
}

/**
 * Orden de las rutinas en Empezar: primero la que hace más que no se hace (las nunca hechas, antes), conservando el orden
 * de la lista ante empates. No es un plan: solo la última fecha real de cada una.
 */
export function ordenParaEmpezar<T>(rutinas: readonly T[], ultima: (r: T) => number | null): T[] {
  return rutinas.map((r, i) => ({ r, i, u: ultima(r) }))
    .sort((a, b) => (a.u ?? -Infinity) - (b.u ?? -Infinity) || a.i - b.i)
    .map(x => x.r)
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
  const { objetivos: _anteriores, agarres: _agarres, ejecuciones: _ejecuciones, ...base } = r
  // Agarre y ejecución son de ese ejercicio: el nuevo empieza con los suyos habituales.
  const agarres = Object.fromEntries(Object.entries(r.agarres ?? {}).filter(([k]) => Number(k) !== de))
  const ejecuciones = Object.fromEntries(Object.entries(r.ejecuciones ?? {}).filter(([k]) => Number(k) !== de))
  const conAgarres = { ...(Object.keys(agarres).length ? { agarres } : {}), ...(Object.keys(ejecuciones).length ? { ejecuciones } : {}) }
  const exerciseIds = r.exerciseIds.map((id) => (id === de ? a : id))
  // La superserie (A21) sigue al ejercicio: el nuevo ocupa su sitio en el par.
  const pares = superseriesDe(r)
  const conPares = pares.length ? { superseries: pares.map(p => p.map(id => (id === de ? a : id)) as unknown as Superserie) } : {}
  return (Object.keys(objetivos).length ? { ...base, exerciseIds, objetivos, ...conAgarres, ...conPares } : { ...base, exerciseIds, ...conAgarres, ...conPares }) as Routine
}

/** Bilateral o una fila por lado: la elegida en la rutina o, si no, la habitual del ejercicio. */
export function ejecucionEnRutina(r: Pick<Routine, 'ejecuciones'>, exerciseId: number, habitual?: ConfiguracionEjecucion): EjecucionRutina {
  return r.ejecuciones?.[exerciseId] ?? (habitual && ejecucionVigente(habitual).ejecucion === 'lados' ? 'lados' : 'bilateral')
}

/**
 * Variante con la que empieza la sesión un ejercicio de la rutina: la habitual con la ejecución y el agarre que la rutina
 * elija. `undefined` si la rutina no elige ninguno de los dos (manda la habitual, como en una sesión libre).
 */
export function ejecucionDeRutina(r: Pick<Routine, 'agarres' | 'ejecuciones'>, exerciseId: number, habitual?: ConfiguracionEjecucion): ConfiguracionEjecucion | undefined {
  const conAgarre = Object.hasOwn(r.agarres ?? {}, exerciseId), ejecucion = r.ejecuciones?.[exerciseId]
  if (!conAgarre && !ejecucion) return undefined
  const base = ejecucionVigente(habitual ?? { ejecucion: 'bilateral' })
  return { ...base, ...(ejecucion ? { ejecucion } : {}), ...(conAgarre ? { agarre: r.agarres![exerciseId] ?? undefined } : {}) }
}

/** «Unilateral · Supino», «Bilateral · agarre sin especificar» (si el ejercicio admite elegirlo) o «Bilateral». */
export function textoVarianteRutina(ejecucion: EjecucionRutina, agarre: string, admiteAgarre: boolean): string {
  const lateralidad = ejecucion === 'lados' ? 'Unilateral' : 'Bilateral'
  return agarre ? `${lateralidad} · ${agarre}` : admiteAgarre ? `${lateralidad} · agarre sin especificar` : lateralidad
}
