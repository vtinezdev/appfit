import { claveAgarre } from '../lib/agarres'
// Acceso a la tabla `sets` (series). Las funciones de lectura no escriben: se pueden usar en un useLiveQuery.
import { aplicarEjecucion, ejecucionSerieNueva, validarSerie, tieneReps, convencional, cambiaRealizacion } from '../lib/ejecucion'
import { esPorTiempo, tieneDatos, valoresPorTiempo, type ConSegundos } from '../lib/tiempo'
import Dexie from 'dexie'
import { db } from '../../../shared/db/db'
import type { Agarre, EjecucionRutina, SetEntry } from '../../../shared/db/types'
import { siguienteOrden, valoresNuevaSerie } from '../lib/workout'
import * as exercisesRepo from './exercisesRepo'
import type { SeleccionEjercicio } from '../lib/selectorEjercicios'
import { aplicarConfiguracionCarga } from '../lib/carga'
import { toISODate } from '../../../shared/lib/dates'
import { dependeDeMaquina, enGimnasio, sinKg } from '../lib/gimnasios'

export function todas(): Promise<SetEntry[]> {
  return db.sets.toArray()
}

export function delWorkout(workoutId: number): Promise<SetEntry[]> {
  return db.sets.where('workoutId').equals(workoutId).toArray()
}

export function delEjercicio(exerciseId: number): Promise<SetEntry[]> {
  return db.sets.where('exerciseId').equals(exerciseId).toArray()
}

/** Filtro de gimnasio: sin él, cualquiera; `{ gimnasioId: undefined }`, solo el habitual (ADR 054). */
export type FiltroGimnasio = { gimnasioId?: number }

/** Serie bilateral o unilateral (por lados o, en el histórico, «ambos iguales»), para precargar con la ejecución de una rutina. */
const conEjecucion = (s: SetEntry, ejecucion?: EjecucionRutina) => ejecucion === undefined || (s.ejecucion === 'lados' || s.ejecucion === 'unilateral' ? 'lados' : 'bilateral') === ejecucion

/** Última serie efectiva (no de calentamiento) del ejercicio, de cualquier entreno (o de ese gimnasio, o con esa ejecución). Solo lectura. */
export function ultimaEfectiva(exerciseId: number, agarre?: Agarre | null, gimnasio?: FiltroGimnasio, ejecucion?: EjecucionRutina): Promise<SetEntry | undefined> {
  return db.sets.where('[exerciseId+createdAt]').between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey]).reverse().filter((s) => s.tipo !== 'calentamiento' && convencional(s) && (agarre === undefined || claveAgarre(s.agarre) === claveAgarre(agarre)) && (!gimnasio || enGimnasio(s, gimnasio.gimnasioId)) && conEjecucion(s, ejecucion)).first()
}

/**
 * Series del ejercicio en su última sesión (la de la última efectiva realizada, con ese agarre, en ese gimnasio y con esa
 * ejecución, si se indican): las realizadas y convencionales, calentamientos incluidos. Para precargar una rutina serie a serie. Solo lectura.
 */
export async function seriesUltimaSesion(exerciseId: number, agarre?: Agarre | null, gimnasio?: FiltroGimnasio, ejecucion?: EjecucionRutina): Promise<SetEntry[]> {
  const comparable = (s: SetEntry) => s.realizada !== false && convencional(s) && (agarre === undefined || claveAgarre(s.agarre) === claveAgarre(agarre)) && (!gimnasio || enGimnasio(s, gimnasio.gimnasioId)) && conEjecucion(s, ejecucion)
  const ultima = await db.sets.where('[exerciseId+createdAt]').between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey]).reverse().filter((s) => s.tipo !== 'calentamiento' && comparable(s)).first()
  if (!ultima) return []
  return db.sets.where('workoutId').equals(ultima.workoutId).filter((s) => s.exerciseId === exerciseId && comparable(s)).toArray()
}

/** La última serie de calentamiento del ejercicio (con ese agarre, en ese gimnasio y con esa ejecución, si se indican). */
export function ultimoCalentamiento(exerciseId: number, agarre?: Agarre | null, gimnasio?: FiltroGimnasio, ejecucion?: EjecucionRutina): Promise<SetEntry | undefined> {
  return db.sets.where('[exerciseId+createdAt]').between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey]).reverse().filter((s) => s.tipo === 'calentamiento' && convencional(s) && (agarre === undefined || claveAgarre(s.agarre) === claveAgarre(agarre)) && (!gimnasio || enGimnasio(s, gimnasio.gimnasioId)) && conEjecucion(s, ejecucion)).first()
}

/**
 * La serie de la que copiar valores en una sesión de `gimnasioId`. Si el ejercicio depende de la máquina, solo cuenta
 * ese gimnasio; si allí nunca se hizo, sirve la del habitual sin kg (`sinKg`). El resto comparte historial.
 * Devuelve también el `gimnasioId` que llevará la serie nueva. Va dentro de la transacción de quien la llama.
 */
export async function previaEnGimnasio(exerciseId: number, gimnasioId: number | undefined, buscar: (gimnasio?: FiltroGimnasio) => Promise<SetEntry | undefined>): Promise<{ previa?: SetEntry; sinKg: boolean; gimnasioId?: number }> {
  const ejercicio = await db.exercises.get(exerciseId)
  if (!dependeDeMaquina(ejercicio)) return { previa: await buscar(), sinKg: false }
  const propia = await buscar({ gimnasioId })
  if (propia || gimnasioId === undefined) return { previa: propia, sinKg: false, gimnasioId }
  const habitual = await buscar({ gimnasioId: undefined })
  return { previa: habitual, sinKg: !!habitual, gimnasioId }
}


/**
 * Añade una serie al ejercicio dentro del entreno, repitiendo reps y peso de la última serie
 * de ese ejercicio. El `orden` se calcula dentro de la transacción: dos toques seguidos dan dos
 * series con órdenes distintos.
 */
export function agregar(workoutId: number, exerciseId: number, createdAt: number = Date.now()): Promise<number> {
  return db.transaction('rw', db.sets, db.workouts, db.pesos, db.exercises, async () => {
    const workout = await db.workouts.get(workoutId)
    const ejercicio = await db.exercises.get(exerciseId)
    const configurada = workout?.ejecucionesEjercicios?.[exerciseId] ?? ejercicio?.ejecucionHabitual
    const delEntreno = await db.sets.where('workoutId').equals(workoutId).filter((s) => s.exerciseId === exerciseId).toArray()
    const enSesion = [...delEntreno].filter(s => s.tipo !== 'calentamiento' && (!configurada || claveAgarre(s.agarre) === claveAgarre(configurada.agarre)))
      .sort((a, b) => a.orden - b.orden).at(-1)
    const gimnasio = await previaEnGimnasio(exerciseId, workout?.gimnasioId, g => ultimaEfectiva(exerciseId, configurada ? configurada.agarre ?? null : undefined, g))
    const previa = enSesion ?? gimnasio.previa
    const valores = enSesion || !gimnasio.sinKg ? valoresNuevaSerie(previa) : sinKg(valoresNuevaSerie(previa))
    const carga = workout?.cargasEjercicios?.[exerciseId]
    if (carga) Object.assign(valores, aplicarConfiguracionCarga(valores, carga))
    else if (valores.modoCarga && previa?.workoutId !== workoutId) valores.pesoCorporal = (await db.pesos.where('fecha').belowOrEqual(toISODate(new Date(workout?.inicio ?? createdAt))).last())?.kg
    const ejecucion = ejecucionSerieNueva(configurada, valores, previa?.workoutId === workoutId)
    if (ejecucion) Object.assign(valores, aplicarEjecucion(valores, ejecucion))
    if (ejercicio && esPorTiempo(ejercicio)) Object.assign(valores, valoresPorTiempo(previa))
    const id = await db.sets.add({
      workoutId,
      exerciseId,
      orden: siguienteOrden(delEntreno),
      ...valores,
      ...(gimnasio.gimnasioId !== undefined ? { gimnasioId: gimnasio.gimnasioId } : {}),
      createdAt,
    })
    if (workout?.ejerciciosOmitidos?.includes(exerciseId)) {
      const omitidos = workout.ejerciciosOmitidos.filter(id => id !== exerciseId)
      await db.workouts.update(workoutId, { ejerciciosOmitidos: omitidos.length ? omitidos : undefined })
    }
    return id
  })
}

/** Busca o crea el ejercicio por nombre y le añade la primera serie. Todo o nada. */
export function agregarConEjercicio(workoutId: number, nombre: string): Promise<number> {
  return db.transaction('rw', db.exercises, db.sets, db.workouts, db.pesos, db.exercises, async () => {
    const exerciseId = await exercisesRepo.obtenerOCrear(nombre)
    return agregar(workoutId, exerciseId)
  })
}

/** Resolver identidad y primera serie en una sola transacción: un fallo no deja un ejercicio huérfano. */
export function agregarSeleccion(workoutId: number, seleccion: SeleccionEjercicio, createdAt: number = Date.now()): Promise<number> {
  return db.transaction('rw', db.exercises, db.sets, db.workouts, db.pesos, db.exercises, async () => {
    const exerciseId = await exercisesRepo.resolverSeleccion(seleccion)
    if (seleccion.agarre !== undefined) {
      const workout = await db.workouts.get(workoutId)
      if (!workout) throw new Error('El entreno ya no está disponible.')
      const habitual = (await db.exercises.get(exerciseId))?.ejecucionHabitual
      const base = workout.ejecucionesEjercicios?.[exerciseId] ?? habitual ?? { ejecucion: 'bilateral' as const }
      await db.workouts.update(workoutId, { ejecucionesEjercicios: { ...workout.ejecucionesEjercicios,
        [exerciseId]: { ...base, agarre: seleccion.agarre ?? undefined } } })
    }
    return agregar(workoutId, exerciseId, createdAt)
  })
}

export type CambiosSerie = Partial<Pick<SetEntry, 'reps' | 'peso' | 'tipo' | 'rir' | 'ejecucion' | 'kgUnilateral' | 'agarre' | 'lados' | 'soloNegativas' | 'excentricaSeg' | 'bajadas'>> & ConSegundos
/** Un cambio calculado sobre la serie guardada: lados y bajadas se combinan dentro de la transacción, no con una copia anterior. */
export type CambioSerie = CambiosSerie | ((actual: SetEntry) => CambiosSerie)
/** Edición física invalida confirmación; cambiar solo RIR/tipo la conserva. */
export function actualizar(id: number, cambio: CambioSerie): Promise<void> {
  return db.transaction('rw', db.sets, async () => {
    const serie = await db.sets.get(id)
    if (!serie) throw new Error('La serie ya no está disponible.')
    const patch = typeof cambio === 'function' ? cambio(serie) : cambio
    validarSerie({ ...serie, ...patch })
    const cambia = cambiaRealizacion(serie, patch)
    await db.sets.update(id, { ...patch, ...(cambia ? { realizada: false } : {}) })
  })
}
export function confirmar(id: number, realizada: boolean): Promise<void> {
  return db.transaction('rw', db.sets, async () => {
    const s = await db.sets.get(id)
    if (s) validarSerie(s)
    if (!s || realizada && !tieneDatos(s, tieneReps(s))) throw new Error('Introduce las repeticiones antes de confirmar.')
    await db.sets.update(id, { realizada })
  })
}

/** `confirmar` de varias series a la vez, todo o nada (marcar en el historial las que quedaron pendientes, y deshacerlo). */
export function confirmarVarias(ids: number[], realizada: boolean): Promise<void> {
  return db.transaction('rw', db.sets, async () => {
    for (const id of ids) await confirmar(id, realizada)
  })
}

/** Borra la serie y la devuelve, para poder deshacer con `restaurar`. */
export function borrar(id: number): Promise<SetEntry | undefined> {
  return db.transaction('rw', db.sets, async () => {
    const set = await db.sets.get(id)
    if (set) await db.sets.delete(id)
    return set
  })
}

/** Vuelve a guardar series borradas con sus mismos ids. */
export async function restaurar(sets: SetEntry[]): Promise<void> {
  await db.sets.bulkPut(sets)
}
