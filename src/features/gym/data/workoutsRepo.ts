// Acceso a la tabla `workouts`. Las funciones de lectura no escriben: se pueden usar en un useLiveQuery.
import { db } from '../../../shared/db/db'
import { recomendarProgresion } from '../lib/progresion'
import { aplicarEjecucion, validarEjecucion, validarSerie, claveComparacion, convencional } from '../lib/ejecucion'
import type { ConfiguracionEjecucion, ConfiguracionCarga, SetEntry, Workout, WorkoutExerciseMuscles } from '../../../shared/db/types'
import { aplicarConfiguracionCarga, validarConfiguracionCarga } from '../lib/carga'
import { toISODate } from '../../../shared/lib/dates'
import { crearSnapshotMuscular } from '../lib/cargaMuscular'
import { valoresNuevaSerie } from '../lib/workout'
import { ultimaEfectiva } from './setsRepo'

/** El entreno en curso (sin `fin`), si hay uno. */
export function activo(): Promise<Workout | undefined> {
  return db.workouts.filter((w) => w.fin === undefined).first()
}

/** Entrenos terminados, ordenados por `inicio` descendente. */
export function terminados(): Promise<Workout[]> {
  return db.workouts.filter((w) => w.fin !== undefined).reverse().sortBy('inicio')
}

/** El último entreno terminado (el de `inicio` más reciente), si hay alguno. */
export function ultimoTerminado(): Promise<Workout | undefined> {
  return db.workouts.orderBy('inicio').reverse().filter((w) => w.fin !== undefined).first()
}

export function listar(): Promise<Workout[]> {
  return db.workouts.toArray()
}

/**
 * Empieza un entreno (vacío o desde una rutina) y devuelve su id.
 * Si ya hay uno en curso devuelve ese: comprobar y crear van en la misma transacción,
 * así que un doble toque no deja dos entrenos activos.
 */
export function empezar(routineId?: number): Promise<number> {
  return db.transaction('rw', db.workouts, db.routines, db.sets, db.pesos, db.exercises, async () => {
    const enCurso = await db.workouts.filter((w) => w.fin === undefined).first()
    if (enCurso) return enCurso.id
    const id = await db.workouts.add(routineId === undefined ? { inicio: Date.now() } : { inicio: Date.now(), routineId })
    if (routineId !== undefined) await crearSeriesObjetivo(id, routineId)
    return id
  })
}

/**
 * Crea las series objetivo de cada ejercicio de la rutina que tenga objetivos, precargadas con los últimos
 * valores efectivos del ejercicio (o 8 × 20 kg). Va dentro de la transacción de quien la llama.
 */
async function crearSeriesObjetivo(workoutId: number, routineId: number, base = Date.now()): Promise<void> {
  const rutina = await db.routines.get(routineId)
  if (!rutina?.objetivos) return
  let orden = 0
  for (const exerciseId of rutina.exerciseIds) {
    const objetivo = rutina.objetivos[exerciseId]
    if (!objetivo) continue
    const valores = valoresNuevaSerie(await ultimaEfectiva(exerciseId))
    const habitual = (await db.exercises.get(exerciseId))?.ejecucionHabitual
    if (habitual) Object.assign(valores, aplicarEjecucion(valores, habitual))
    if (valores.modoCarga) valores.pesoCorporal = (await db.pesos.where('fecha').belowOrEqual(toISODate(new Date(base))).last())?.kg
    for (let i = 0; i < objetivo.series; i++) {
      await db.sets.add({ workoutId, exerciseId, orden: i, ...valores, createdAt: base + orden++ })
    }
  }
}

/** Borra un entreno (en curso o terminado) y todas sus series, todo o nada. */
export function descartar(id: number): Promise<void> {
  return db.transaction('rw', db.workouts, db.sets, async () => {
    await db.sets.where('workoutId').equals(id).delete()
    await db.workouts.delete(id)
  })
}

/** Borrar un entreno del historial: lo mismo que descartar. */
export const borrar = descartar

export class TiempoEntrenoInvalido extends Error {}

/**
 * Registra un entreno pasado ya terminado. Nunca crea un entreno activo (tiene `fin`), así que no interfiere
 * con el invariante «como mucho uno activo». Con rutina, crea sus series objetivo como al empezar.
 */
export function crearPasado(datos: { inicio: number; fin: number; routineId?: number }): Promise<number> {
  if (!(datos.fin > datos.inicio)) throw new TiempoEntrenoInvalido('El entreno debe terminar después de empezar.')
  return db.transaction('rw', db.workouts, db.routines, db.sets, db.exercises, db.pesos, async () => {
    const base: Omit<Workout, 'id'> = { inicio: datos.inicio, fin: datos.fin, ...(datos.routineId !== undefined ? { routineId: datos.routineId } : {}) }
    const id = await db.workouts.add(base as Workout)
    if (datos.routineId !== undefined) await crearSeriesObjetivo(id, datos.routineId, datos.inicio)
    await recalcularEn(id)
    return id
  })
}

/** Cambia inicio y fin de un entreno terminado. */
export function actualizarTiempos(id: number, inicio: number, fin: number): Promise<void> {
  if (!(fin > inicio)) throw new TiempoEntrenoInvalido('El entreno debe terminar después de empezar.')
  return db.transaction('rw', db.workouts, async () => {
    const w = await db.workouts.get(id)
    if (!w || w.fin === undefined) throw new Error('El entrenamiento ya no está disponible.')
    await db.workouts.update(id, { inicio, fin })
  })
}

async function recalcularEn(id: number): Promise<void> {
  const w = await db.workouts.get(id)
  if (!w || w.fin === undefined) return
  const sets = await db.sets.where('workoutId').equals(id).toArray()
  await db.workouts.update(id, { muscleSnapshot: crearSnapshotMuscular(sets, await db.exercises.toArray()) })
}

/**
 * Recalcula el `muscleSnapshot` de un entreno terminado con la clasificación actual de sus ejercicios
 * (se llama tras añadir o quitar series al editarlo). No toca entrenos en curso.
 */
export function recalcularSnapshot(id: number): Promise<void> {
  return db.transaction('rw', db.workouts, db.sets, db.exercises, () => recalcularEn(id))
}

export async function guardarNotas(id: number, notas: string): Promise<void> {
  await db.workouts.update(id, { notas: notas.trim() ? notas : undefined })
}

export async function guardarOrden(id: number, orden: number[]): Promise<void> {
  await db.workouts.update(id, { ordenEjercicios: orden })
}

export function guardarNotaEjercicio(workoutId: number, exerciseId: number, nota: string): Promise<void> {
  return db.transaction('rw', db.workouts, async () => {
    const w = await db.workouts.get(workoutId)
    if (!w) throw new Error('El entrenamiento ya no está disponible.')
    const notas = { ...w.notasEjercicios }
    if (nota.trim()) notas[exerciseId] = nota.trim()
    else delete notas[exerciseId]
    await db.workouts.update(workoutId, { notasEjercicios: Object.keys(notas).length ? notas : undefined })
  })
}

/** Última nota anterior al entreno, sin copiarla ni escribir datos. */
export async function ultimaNotaEjercicio(exerciseId: number, antesDe: number): Promise<{ nota: string; inicio: number } | undefined> {
  const w = await db.workouts.where('inicio').below(antesDe).reverse()
    .filter(w => w.fin !== undefined && !!w.notasEjercicios?.[exerciseId] && !w.ejerciciosOmitidos?.includes(exerciseId)).first()
  return w ? { nota: w.notasEjercicios![exerciseId], inicio: w.inicio } : undefined
}

export function configurarCarga(workoutId: number, exerciseId: number, carga: ConfiguracionCarga): Promise<number[]> {
  validarConfiguracionCarga(carga)
  return db.transaction('rw', db.workouts, db.sets, async () => {
    const w = await db.workouts.get(workoutId)
    if (!w) throw new Error('El entrenamiento ya no está disponible.')
    const sets = await db.sets.where('workoutId').equals(workoutId).filter(s => s.exerciseId === exerciseId).toArray()
    const cambiadas: number[] = []
    for (const s of sets) {
      const patch = aplicarConfiguracionCarga(s, carga)
      if ((s.modoCarga ?? 'externa') !== (patch.modoCarga ?? 'externa') || s.peso !== patch.peso || s.pesoCorporal !== patch.pesoCorporal) {
        await db.sets.update(s.id, { ...patch, ...((s.modoCarga ?? 'externa') !== (patch.modoCarga ?? 'externa') ? { lados: undefined, bajadas: undefined } : {}), realizada: false }); cambiadas.push(s.id)
      }
    }
    await db.workouts.update(workoutId, { cargasEjercicios: { ...w.cargasEjercicios, [exerciseId]: carga } })
    return cambiadas
  })
}

export interface EjercicioQuitado {
  workoutId: number
  exerciseId: number
  sets: SetEntry[]
  nota?: string
  carga?: ConfiguracionCarga
  ejecucion?: ConfiguracionEjecucion
  musculo?: { indice: number; ejercicio: WorkoutExerciseMuscles }
}

/** Quita solo la ejecución de esta sesión, también si la rutina la incluye sin series. */
export function quitarEjercicio(workoutId: number, exerciseId: number): Promise<EjercicioQuitado | undefined> {
  return db.transaction('rw', db.workouts, db.sets, async () => {
    const w = await db.workouts.get(workoutId)
    if (!w) throw new Error('El entrenamiento ya no está disponible.')
    if (w.ejerciciosOmitidos?.includes(exerciseId)) return undefined
    const sets = await db.sets.where('workoutId').equals(workoutId).filter(s => s.exerciseId === exerciseId).toArray()
    const indice = w.muscleSnapshot?.exercises.findIndex(e => e.exerciseId === exerciseId) ?? -1
    const musculo = indice >= 0 ? { indice, ejercicio: w.muscleSnapshot!.exercises[indice] } : undefined
    const nota = w.notasEjercicios?.[exerciseId], carga = w.cargasEjercicios?.[exerciseId], ejecucion = w.ejecucionesEjercicios?.[exerciseId]
    const ejecuciones = { ...w.ejecucionesEjercicios }; delete ejecuciones[exerciseId]
    const notas = { ...w.notasEjercicios }, cargas = { ...w.cargasEjercicios }
    delete notas[exerciseId]; delete cargas[exerciseId]
    await db.sets.bulkDelete(sets.map(s => s.id))
    // Mantener el orden original permite deshacer sin sobrescribir otros movimientos posteriores.
    await db.workouts.update(workoutId, {
      ejecucionesEjercicios: Object.keys(ejecuciones).length ? ejecuciones : undefined,
      ejerciciosOmitidos: [...(w.ejerciciosOmitidos ?? []), exerciseId],
      ...(w.notasEjercicios ? { notasEjercicios: Object.keys(notas).length ? notas : undefined } : {}),
      ...(w.cargasEjercicios ? { cargasEjercicios: Object.keys(cargas).length ? cargas : undefined } : {}),
      ...(w.muscleSnapshot ? { muscleSnapshot: { ...w.muscleSnapshot, exercises: w.muscleSnapshot.exercises.filter(e => e.exerciseId !== exerciseId) } } : {}),
    })
    return { workoutId, exerciseId, sets, ...(musculo ? { musculo } : {}), ...(nota ? { nota } : {}), ...(carga ? { carga } : {}), ...(ejecucion ? { ejecucion } : {}) }
  })
}

/** Deshacer conserva ids y clasificación histórica; no revierte otros ejercicios ni notas. */
export function restaurarEjercicio(captura: EjercicioQuitado): Promise<void> {
  return db.transaction('rw', db.workouts, db.sets, async () => {
    const w = await db.workouts.get(captura.workoutId)
    if (!w) throw new Error('El entrenamiento ya no está disponible.')
    const existentes = await db.sets.bulkGet(captura.sets.map(s => s.id))
    await db.sets.bulkAdd(captura.sets.filter((_, i) => existentes[i] === undefined))
    const omitidos = w.ejerciciosOmitidos?.filter(id => id !== captura.exerciseId) ?? []
    const snapshot = w.muscleSnapshot
    const ejercicios = snapshot ? [...snapshot.exercises] : []
    if (captura.musculo && !ejercicios.some(e => e.exerciseId === captura.exerciseId)) {
      ejercicios.splice(Math.min(captura.musculo.indice, ejercicios.length), 0, captura.musculo.ejercicio)
    }
    await db.workouts.update(w.id, {
      ejerciciosOmitidos: omitidos.length ? omitidos : undefined,
      ...(captura.ejecucion && !w.ejecucionesEjercicios?.[captura.exerciseId] ? { ejecucionesEjercicios: { ...w.ejecucionesEjercicios, [captura.exerciseId]: captura.ejecucion } } : {}),
      ...(captura.nota && !w.notasEjercicios?.[captura.exerciseId] ? { notasEjercicios: { ...w.notasEjercicios, [captura.exerciseId]: captura.nota } } : {}),
      ...(captura.carga && !w.cargasEjercicios?.[captura.exerciseId] ? { cargasEjercicios: { ...w.cargasEjercicios, [captura.exerciseId]: captura.carga } } : {}),
      ...(captura.musculo ? { muscleSnapshot: { version: 1, exercises: ejercicios } } : {}),
    })
  })
}

export function obtener(id: number): Promise<Workout | undefined> {
  return db.workouts.get(id)
}

/** Cierre y clasificación coherentes con las series guardadas; idempotente ante un doble cierre. */
export function terminar(id: number, confirmadas?: number[]): Promise<{ workout: Workout; sets: SetEntry[] }> {
  return db.transaction('rw', db.workouts, db.exercises, db.sets, async () => {
    const workout = await db.workouts.get(id)
    if (!workout) throw new Error('El entrenamiento ya no está disponible.')
    let sets = await db.sets.where('workoutId').equals(id).toArray()
    if (workout.fin !== undefined) return { workout, sets }
    if (confirmadas) {
      const ids = new Set(confirmadas)
      for (const s of sets) await db.sets.update(s.id, { realizada: ids.has(s.id) })
      sets = sets.map(s => ({ ...s, realizada: ids.has(s.id) }))
    }
    const muscleSnapshot = crearSnapshotMuscular(sets, await db.exercises.toArray())
    const fin = Date.now()
    await db.workouts.update(id, { fin, muscleSnapshot })
    return { workout: { ...workout, fin, muscleSnapshot }, sets }
  })
}

/** Configuración de esta sesión; el valor habitual es opt-in y nunca reescribe historial. */
export function configurarEjecucion(workoutId: number, exerciseId: number, config: ConfiguracionEjecucion, habitual = false): Promise<number[]> {
  validarEjecucion(config)
  return db.transaction('rw', db.workouts, db.sets, db.exercises, async () => {
    const w = await db.workouts.get(workoutId)
    if (!w) throw new Error('El entreno ya no está disponible.')
    const ss = await db.sets.where('workoutId').equals(workoutId).filter(s => s.exerciseId === exerciseId).toArray()
    const ids: number[] = []
    for (const s of ss) {
      const patch = aplicarEjecucion(s, config)
      if (Object.entries(patch).some(([k, v]) => JSON.stringify(s[k as keyof SetEntry]) !== JSON.stringify(v))) {
        await db.sets.update(s.id, { ...patch, realizada: false }); ids.push(s.id)
      }
    }
    await db.workouts.update(workoutId, { ejecucionesEjercicios: { ...w.ejecucionesEjercicios, [exerciseId]: config } })
    if (habitual) await db.exercises.update(exerciseId, { ejecucionHabitual: config })
    return ids
  })
}

/** Revalida la propuesta dentro de la transacción antes de modificar series aún no realizadas. */
export function decidirProgresion(workoutId: number, exerciseId: number, clave: string, decision: 'aplicada' | 'mantener' | 'descartada'): Promise<void> {
  return db.transaction('rw', db.workouts, db.sets, db.exercises, db.routines, async () => {
    const w = await db.workouts.get(workoutId), e = await db.exercises.get(exerciseId)
    if (!w || w.fin !== undefined || !e) throw new Error('Solo se aplica en un entreno activo.')
    const ss = (await db.sets.where('workoutId').equals(workoutId).filter(s => s.exerciseId === exerciseId).toArray()).sort((a, b) => a.orden - b.orden)
    const base = ss.find(s => s.tipo !== 'calentamiento')
    if (!base) throw new Error('Añade una serie antes de aplicar la propuesta.')
    const rutina = w.routineId ? await db.routines.get(w.routineId) : undefined
    const plan = e.progresion ?? rutina?.objetivos?.[exerciseId]
    const resultado = recomendarProgresion(exerciseId, base, plan, await db.workouts.toArray(), await db.sets.toArray(), w.inicio)
    const p = resultado.propuesta
    if (!p || p.clave !== clave) throw new Error('La propuesta ha cambiado. Revisa los datos actuales.')
    if (decision === 'aplicada') {
      if (ss.some(s => s.realizada === true || s.tipo === 'calentamiento' || !convencional(s) || claveComparacion(s) !== claveComparacion(base)) || ss.length > p.series.length) throw new Error('Aplica antes de completar series y con una misma variante y sin calentamientos o técnicas añadidas. Mantener no cambia tus registros.')
      for (let i = 0; i < p.series.length; i++) {
        const valores = { ...p.series[i], rir: undefined, realizada: false }
        validarSerie({ ...(ss[i] ?? base), ...valores })
        if (ss[i]) await db.sets.update(ss[i].id, valores)
        else {
          const { id: _id, ...plantilla } = base
          await db.sets.add({ ...plantilla, ...valores, rir: undefined, orden: i, createdAt: Date.now() + i })
        }
      }
    }
    await db.workouts.update(workoutId, { decisionesProgresion: { ...w.decisionesProgresion, [exerciseId]: { clave, decision } } })
  })
}
