// Acceso a la tabla `workouts`. Las funciones de lectura no escriben: se pueden usar en un useLiveQuery.
import { db } from '../../../shared/db/db'
import { recomendarProgresion } from '../lib/progresion'
import { aplicarEjecucion, validarEjecucion, validarSerie, claveComparacion, convencional, ejecucionSerieNueva, ejecucionVigente, tieneReps } from '../lib/ejecucion'
import { esPorTiempo, tieneDatos, valoresPorTiempo } from '../lib/tiempo'
import type { ConfiguracionEjecucion, ConfiguracionCarga, EjecucionRutina, Routine, SetEntry, Workout, WorkoutExerciseMuscles } from '../../../shared/db/types'
import { aplicarConfiguracionCarga, validarConfiguracionCarga } from '../lib/carga'
import { toISODate } from '../../../shared/lib/dates'
import { crearSnapshotMuscular } from '../lib/cargaMuscular'
import { ordenEjerciciosSesion, previasPorSerie, siguienteOrden, tiemposAlTerminar, valoresNuevaSerie } from '../lib/workout'
import { previaEnGimnasio, seriesUltimaSesion, ultimaEfectiva, ultimoCalentamiento } from './setsRepo'
import { dependeDeMaquina, gimnasioDeSerie, sinKg } from '../lib/gimnasios'
import { ejerciciosDelEntreno, seriesParaRepetir } from '../lib/repetirEntreno'
import { ejecucionDeRutina } from '../lib/rutinas'
import { ordenTrasSustituir } from '../lib/sustituir'
import * as exercisesRepo from './exercisesRepo'
import { sustituirEjercicio as sustituirEnRutinaRepo } from './routinesRepo'
import type { SeleccionEjercicio } from '../lib/selectorEjercicios'
import { superseriesDe, type ConSuperseries, type Superserie } from '../lib/superseries'

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
export function empezar(routineId?: number, gimnasioId?: number): Promise<number> {
  return db.transaction('rw', db.workouts, db.routines, db.sets, db.pesos, db.exercises, async () => {
    const enCurso = await db.workouts.filter((w) => w.fin === undefined).first()
    if (enCurso) return enCurso.id
    // Las superseries de la rutina (A21) pasan a la sesión, donde se pueden cambiar sin tocar la rutina.
    const pares = routineId !== undefined ? superseriesDe(await db.routines.get(routineId)) : []
    const id = await db.workouts.add({ inicio: Date.now(), ...(routineId !== undefined ? { routineId } : {}), ...(gimnasioId !== undefined ? { gimnasioId } : {}), ...(pares.length ? { superseries: pares } : {}) } as Workout & ConSuperseries)
    if (routineId !== undefined) await crearSeriesObjetivo(id, routineId, Date.now(), gimnasioId)
    return id
  })
}

/**
 * Crea las series objetivo de cada ejercicio de la rutina que tenga objetivos. Cada una copia reps y kg de la serie del mismo
 * número en la última sesión del ejercicio (`previasPorSerie`: calentamientos con calentamientos, efectivas con efectivas,
 * solo las realizadas; si la rutina pide más, la última de su tipo). Sin esa sesión, la última efectiva (o 8 × 20 kg); un
 * calentamiento sin par, el último calentamiento del ejercicio (o su primera efectiva). En otro gimnasio, los ejercicios de
 * máquina toman los valores de ese gimnasio, o los del habitual sin kg si allí nunca se hicieron. Va dentro de la
 * transacción de quien la llama.
 */
async function crearSeriesObjetivo(workoutId: number, routineId: number, base = Date.now(), gimnasioId?: number): Promise<void> {
  const rutina = await db.routines.get(routineId)
  if (!rutina) return
  const ejecuciones: NonNullable<Workout['ejecucionesEjercicios']> = {}
  for (const exerciseId of rutina.exerciseIds) {
    const config = ejecucionDeRutina(rutina, exerciseId, (await db.exercises.get(exerciseId))?.ejecucionHabitual)
    if (!config) continue
    validarEjecucion(config)
    ejecuciones[exerciseId] = config
  }
  if (Object.keys(ejecuciones).length) await db.workouts.update(workoutId, { ejecucionesEjercicios: ejecuciones })
  if (!rutina.objetivos) return
  let orden = 0
  for (const exerciseId of rutina.exerciseIds) {
    const objetivo = rutina.objetivos[exerciseId]
    if (!objetivo) continue
    const ejercicio = await db.exercises.get(exerciseId)
    const config = ejecuciones[exerciseId] ?? ejercicio?.ejecucionHabitual
    const agarre = config ? config.agarre ?? null : undefined
    const buscarPrevias = async (ejecucion?: EjecucionRutina) => {
      // `previaEnGimnasio` devuelve lo de su última búsqueda, así que `sesion` queda con las series de ese mismo gimnasio.
      let sesion: SetEntry[] = []
      const ultimaSesion = await previaEnGimnasio(exerciseId, gimnasioId, async g => {
        sesion = await seriesUltimaSesion(exerciseId, agarre, g, ejecucion)
        return sesion.find(s => s.tipo !== 'calentamiento')
      })
      return { ejecucion, sesion, efectiva: ultimaSesion.previa ? ultimaSesion : await previaEnGimnasio(exerciseId, gimnasioId, g => ultimaEfectiva(exerciseId, agarre, g, ejecucion)) }
    }
    // Con la ejecución fijada en la rutina, se copia de la última vez que se hizo así; si nunca, de la última (y se vacía al aplicarla).
    const fija = rutina.ejecuciones?.[exerciseId]
    const conFija = fija ? await buscarPrevias(fija) : undefined
    const { ejecucion: ejecucionPrevia, sesion, efectiva } = conFija?.efectiva.previa ? conFija : await buscarPrevias()
    const pares = previasPorSerie(sesion, objetivo.calentamientos ?? 0, objetivo.series)
    const sinPar = pares.calentamientos.some(c => !c) ? await previaEnGimnasio(exerciseId, gimnasioId, g => ultimoCalentamiento(exerciseId, agarre, g, ejecucionPrevia)) : undefined
    const respaldoCalentamiento = sinPar?.previa ? sinPar : { ...efectiva, previa: pares.efectivas[0] ?? efectiva.previa }
    const pesoCorporal = (await db.pesos.where('fecha').belowOrEqual(toISODate(new Date(base))).last())?.kg
    const valoresDe = ({ previa, sinKg: vaciar, gimnasioId }: Awaited<ReturnType<typeof previaEnGimnasio>>) => {
      const valores: Partial<SetEntry> & ReturnType<typeof valoresNuevaSerie> = vaciar ? sinKg(valoresNuevaSerie(previa)) : valoresNuevaSerie(previa)
      if (gimnasioId !== undefined) valores.gimnasioId = gimnasioId
      const ejecucion = ejecucionSerieNueva(config, valores, false)
      if (ejecucion) Object.assign(valores, aplicarEjecucion(valores, ejecucion))
      if (valores.modoCarga) valores.pesoCorporal = pesoCorporal
      if (ejercicio && esPorTiempo(ejercicio)) Object.assign(valores, valoresPorTiempo(previa))
      return valores
    }
    let i = 0
    for (const par of pares.calentamientos) {
      const valores = valoresDe(par ? { ...efectiva, previa: par } : respaldoCalentamiento)
      await db.sets.add({ workoutId, exerciseId, orden: i++, ...valores, tipo: 'calentamiento', createdAt: base + orden++ })
    }
    for (const par of pares.efectivas) {
      await db.sets.add({ workoutId, exerciseId, orden: i++, ...valoresDe(par ? { ...efectiva, previa: par } : efectiva), createdAt: base + orden++ })
    }
  }
}

/**
 * Empieza un entreno nuevo igual que uno terminado: mismos ejercicios, orden y series (con sus cifras, sin marcar), la
 * misma configuración de carga y ejecución, y su rutina si aún existe (los ejercicios que la rutina tenga ahora y ese día
 * no se hicieron quedan omitidos). Como `empezar`, si ya hay uno en curso devuelve ese sin crear otro.
 */
export function repetir(workoutId: number): Promise<number> {
  return db.transaction('rw', db.workouts, db.routines, db.sets, db.pesos, async () => {
    const enCurso = await db.workouts.filter((w) => w.fin === undefined).first()
    if (enCurso) return enCurso.id
    const origen = await db.workouts.get(workoutId)
    if (!origen || origen.fin === undefined) throw new Error('Ese entreno ya no está disponible.')
    const sets = await db.sets.where('workoutId').equals(workoutId).toArray()
    const inicio = Date.now()
    const pesoCorporal = (await db.pesos.where('fecha').belowOrEqual(toISODate(new Date(inicio))).last())?.kg
    const orden = ejerciciosDelEntreno(origen, sets)
    const rutina = origen.routineId !== undefined ? await db.routines.get(origen.routineId) : undefined
    const omitidos = rutina?.exerciseIds.filter(id => !orden.includes(id)) ?? []
    const cargas = origen.cargasEjercicios && Object.fromEntries(Object.entries(origen.cargasEjercicios).filter(([k]) => orden.includes(Number(k)))
      .map(([k, c]) => [k, c.modo !== 'externa' && pesoCorporal !== undefined ? { ...c, pesoCorporal } : c]))
    const ejecuciones = origen.ejecucionesEjercicios && Object.fromEntries(Object.entries(origen.ejecucionesEjercicios).filter(([k]) => orden.includes(Number(k))))
    const nuevo: Omit<Workout, 'id'> = { inicio, ...(rutina ? { routineId: rutina.id } : {}),
      ...(orden.length ? { ordenEjercicios: orden } : {}), ...(omitidos.length ? { ejerciciosOmitidos: omitidos } : {}),
      ...(cargas && Object.keys(cargas).length ? { cargasEjercicios: cargas } : {}),
      ...(ejecuciones && Object.keys(ejecuciones).length ? { ejecucionesEjercicios: ejecuciones } : {}),
      ...(origen.gimnasioId !== undefined ? { gimnasioId: origen.gimnasioId } : {}) }
    const pares = superseriesDe(origen).filter(p => orden.includes(p[0]) && orden.includes(p[1]))
    const id = await db.workouts.add({ ...nuevo, ...(pares.length ? { superseries: pares } : {}) } as Workout)
    await db.sets.bulkAdd(seriesParaRepetir(origen, sets, pesoCorporal).map((s, i) => ({ ...s, workoutId: id, createdAt: inicio + i })) as SetEntry[])
    return id
  })
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
export function crearPasado(datos: { inicio: number; fin: number; routineId?: number; gimnasioId?: number }): Promise<number> {
  if (!(datos.fin > datos.inicio)) throw new TiempoEntrenoInvalido('El entreno debe terminar después de empezar.')
  return db.transaction('rw', db.workouts, db.routines, db.sets, db.exercises, db.pesos, async () => {
    const base: Omit<Workout, 'id'> = { inicio: datos.inicio, fin: datos.fin, ...(datos.routineId !== undefined ? { routineId: datos.routineId } : {}),
      ...(datos.gimnasioId !== undefined ? { gimnasioId: datos.gimnasioId } : {}) }
    const id = await db.workouts.add(base as Workout)
    if (datos.routineId !== undefined) await crearSeriesObjetivo(id, datos.routineId, datos.inicio, datos.gimnasioId)
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

/** Anota (o quita, con `undefined`) el id de la publicación del entreno en Amigos. */
export async function marcarPublicacion(id: number, publicacion: string | undefined): Promise<void> {
  await db.workouts.update(id, { publicacion })
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

/**
 * Cierre y clasificación coherentes con las series guardadas; idempotente ante un doble cierre. Con `marcarTodas`
 * (lo elige la persona al terminar, nunca se infiere) también quedan hechas las no marcadas que tengan repeticiones.
 */
/** `minutos`: la duración corregida al terminar (`lib/workout.tiemposAlTerminar`); sin ella, la del reloj. */
export function terminar(id: number, confirmadas?: number[], marcarTodas = false, minutos: number | null = null): Promise<{ workout: Workout; sets: SetEntry[] }> {
  return db.transaction('rw', db.workouts, db.exercises, db.sets, async () => {
    const workout = await db.workouts.get(id)
    if (!workout) throw new Error('El entrenamiento ya no está disponible.')
    let sets = await db.sets.where('workoutId').equals(id).toArray()
    if (workout.fin !== undefined) return { workout, sets }
    if (confirmadas) {
      const ids = new Set(confirmadas)
      const hecha = (s: SetEntry) => ids.has(s.id) || marcarTodas && tieneDatos(s, tieneReps(s))
      for (const s of sets) await db.sets.update(s.id, { realizada: hecha(s) })
      sets = sets.map(s => ({ ...s, realizada: hecha(s) }))
    }
    const muscleSnapshot = crearSnapshotMuscular(sets, await db.exercises.toArray())
    const { inicio, fin } = tiemposAlTerminar(workout.inicio, Date.now(), minutos)
    await db.workouts.update(id, { inicio, fin, muscleSnapshot })
    return { workout: { ...workout, inicio, fin, muscleSnapshot }, sets }
  })
}

/**
 * Cambia el gimnasio de un entreno, en curso o del historial (ADR 054). Las series de ejercicios de máquina pasan a llevar el
 * nuevo `gimnasioId`. Las realizadas conservan cifras y marca: se hicieron allí, solo se había elegido mal el gimnasio. En un
 * entreno en curso, las pendientes se vuelven a precargar con las cifras de ese gimnasio, o sin kg si allí nunca se hizo el
 * ejercicio. Devuelve los ids de las series cuyas cifras cambiaron.
 */
export function cambiarGimnasio(workoutId: number, gimnasioId: number | undefined): Promise<number[]> {
  return db.transaction('rw', db.workouts, db.sets, db.exercises, db.gimnasios, async () => {
    const w = await db.workouts.get(workoutId)
    if (!w) throw new Error('El entreno ya no está disponible.')
    if (gimnasioId !== undefined && !(await db.gimnasios.get(gimnasioId))) throw new Error('Ese gimnasio ya no está disponible.')
    if (w.gimnasioId === gimnasioId) return []
    const sets = await db.sets.where('workoutId').equals(workoutId).toArray()
    const cambios: { id: number; patch: Partial<SetEntry> }[] = []
    // Las previas se buscan antes de reestampar: las series de esta sesión aún llevan el gimnasio anterior y no cuentan.
    for (const exerciseId of new Set(sets.map(s => s.exerciseId))) {
      const ejercicio = await db.exercises.get(exerciseId)
      if (!dependeDeMaquina(ejercicio)) continue
      for (const s of sets.filter(x => x.exerciseId === exerciseId)) {
        const patch: Partial<SetEntry> = { gimnasioId: gimnasioDeSerie(gimnasioId, ejercicio) }
        if (w.fin === undefined && s.realizada !== true) {
          const buscar = s.tipo === 'calentamiento' ? ultimoCalentamiento : ultimaEfectiva
          const { previa, sinKg: vaciar } = await previaEnGimnasio(exerciseId, gimnasioId, g => buscar(exerciseId, s.agarre ?? null, g))
          if (previa && !vaciar && previa.ejecucion === s.ejecucion) Object.assign(patch, { reps: previa.reps, peso: previa.peso, ...(s.lados && previa.lados ? { lados: valoresNuevaSerie(previa).lados } : {}) })
          else if (previa || gimnasioId !== undefined) Object.assign(patch, sinKg({ peso: s.peso, ...(s.lados ? { lados: s.lados } : {}) }))
        }
        cambios.push({ id: s.id, patch })
      }
    }
    await db.workouts.update(workoutId, { gimnasioId })
    const cifras: number[] = []
    for (const { id, patch } of cambios) {
      const antes = sets.find(s => s.id === id)!
      await db.sets.update(id, patch)
      if (['reps', 'peso', 'lados'].some(k => k in patch && JSON.stringify(antes[k as keyof SetEntry]) !== JSON.stringify(patch[k as keyof SetEntry]))) cifras.push(id)
    }
    return cifras
  })
}

/** Configuración de esta sesión; el valor habitual es opt-in y nunca reescribe historial. */
export function configurarEjecucion(workoutId: number, exerciseId: number, pedida: ConfiguracionEjecucion, habitual = false): Promise<number[]> {
  validarEjecucion(pedida)
  const config = ejecucionVigente(pedida)
  return db.transaction('rw', db.workouts, db.sets, db.exercises, async () => {
    const w = await db.workouts.get(workoutId)
    if (!w) throw new Error('El entreno ya no está disponible.')
    const ss = await db.sets.where('workoutId').equals(workoutId).filter(s => s.exerciseId === exerciseId).toArray()
    const ids: number[] = []
    for (const s of ss) {
      const patch = aplicarEjecucion(s, config)
      if (Object.entries(patch).some(([k, v]) => JSON.stringify(s[k as keyof SetEntry]) !== JSON.stringify(v))) {
        // Pasar de «ambos iguales» a cada lado conserva los datos: la serie sigue hecha si lo estaba.
        await db.sets.update(s.id, { ...patch, ...(s.ejecucion === 'unilateral' && config.ejecucion === 'lados' ? {} : { realizada: false }) }); ids.push(s.id)
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

/** Lo necesario para deshacer una sustitución: las series movidas tal cual estaban, las creadas y el orden y la rutina de antes. */
export interface Sustitucion {
  workoutId: number
  de: number
  nuevo: number
  movidas: SetEntry[]
  creadas: number[]
  orden: Pick<Workout, 'ordenEjercicios' | 'ejerciciosOmitidos'> & ConSuperseries
  rutina?: Routine
}

/**
 * Sustituye un ejercicio en plena sesión (ENT-01), en una transacción: las series sin hacer de `de` pasan al ejercicio
 * elegido conservando su id, su orden relativo, su tipo de calentamiento y sus reps; los kg salen de la última vez del
 * nuevo en este gimnasio (`previaEnGimnasio`, como al añadir una serie; sin historial allí, sin kg), sin RIR ni técnicas
 * del anterior. Las hechas se quedan. Si no quedaba ninguna sin hacer, el nuevo empieza con una serie. El nuevo ocupa el
 * sitio de `de` (o va detrás si este conserva series); si `de` era de la rutina y se queda sin series, se omite en esta
 * sesión. Con `tambienRutina`, la rutina también cambia (`routinesRepo.sustituirEjercicio`). Devuelve la captura para deshacer.
 */
export function sustituirEnSesion(workoutId: number, de: number, seleccion: SeleccionEjercicio, tambienRutina = false): Promise<Sustitucion> {
  return db.transaction('rw', [db.workouts, db.sets, db.exercises, db.pesos, db.routines], async () => {
    const w = await db.workouts.get(workoutId)
    if (!w || w.fin !== undefined) throw new Error('El entreno ya no está en curso.')
    const nuevo = await exercisesRepo.resolverSeleccion(seleccion)
    if (nuevo === de) throw new Error('Es el mismo ejercicio.')
    const rutinaAntes = w.routineId !== undefined ? await db.routines.get(w.routineId) : undefined
    const sets = await db.sets.where('workoutId').equals(workoutId).toArray()
    const delAnterior = sets.filter(s => s.exerciseId === de).sort((a, b) => a.orden - b.orden)
    const movidas = delAnterior.filter(s => s.realizada !== true)
    const ejercicio = await db.exercises.get(nuevo)
    const configurada = w.ejecucionesEjercicios?.[nuevo] ?? ejercicio?.ejecucionHabitual
    const carga = w.cargasEjercicios?.[nuevo]
    const pesoCorporal = (await db.pesos.where('fecha').belowOrEqual(toISODate(new Date(w.inicio))).last())?.kg
    let orden = siguienteOrden(sets.filter(s => s.exerciseId === nuevo))
    /** Valores de una serie del nuevo ejercicio, como `setsRepo.agregar`, con las reps de la que sustituye. */
    async function valores(calentamiento: boolean, reps?: number) {
      const buscar = calentamiento ? ultimoCalentamiento : ultimaEfectiva
      const g = await previaEnGimnasio(nuevo, w!.gimnasioId, f => buscar(nuevo, configurada ? configurada.agarre ?? null : undefined, f))
      const v: Partial<SetEntry> = g.sinKg ? sinKg(valoresNuevaSerie(g.previa)) : valoresNuevaSerie(g.previa)
      if (reps && reps > 0) v.reps = reps
      if (carga) Object.assign(v, aplicarConfiguracionCarga(v as SetEntry, carga))
      else if (v.modoCarga) v.pesoCorporal = pesoCorporal
      const ejecucion = ejecucionSerieNueva(configurada, v, false)
      if (ejecucion) Object.assign(v, aplicarEjecucion(v as SetEntry, ejecucion))
      if (ejercicio && esPorTiempo(ejercicio)) Object.assign(v, valoresPorTiempo(g.previa))
      return { ...v, ...(g.gimnasioId !== undefined ? { gimnasioId: g.gimnasioId } : {}) }
    }
    for (const s of movidas) {
      await db.sets.put({ id: s.id, workoutId, exerciseId: nuevo, orden: orden++, createdAt: s.createdAt,
        ...(s.tipo === 'calentamiento' ? { tipo: 'calentamiento' as const } : {}), ...(await valores(s.tipo === 'calentamiento', s.reps)) } as SetEntry)
    }
    const creadas: number[] = []
    if (!movidas.length) creadas.push(await db.sets.add({ workoutId, exerciseId: nuevo, orden, createdAt: Date.now(), ...(await valores(false)) } as SetEntry))
    const deSigue = delAnterior.length > movidas.length
    let rutina: Routine | undefined
    if (tambienRutina && rutinaAntes?.exerciseIds.includes(de)) rutina = await sustituirEnRutinaRepo(rutinaAntes.id!, de, seleccion)
    const idsRutina = (await (w.routineId !== undefined ? db.routines.get(w.routineId) : undefined))?.exerciseIds ?? []
    const conSeries = [...new Set([...sets].sort((a, b) => a.createdAt - b.createdAt).map(s => s.exerciseId))]
    const visibles = ordenEjerciciosSesion(rutinaAntes?.exerciseIds ?? [], conSeries, w.ordenEjercicios, w.ejerciciosOmitidos)
    const omitir = !deSigue && idsRutina.includes(de)
    const omitidos = [...(w.ejerciciosOmitidos ?? []).filter(id => id !== nuevo), ...(omitir ? [de] : [])]
    // Si el nuevo ocupa el sitio del anterior, también ocupa su sitio en la superserie (A21).
    const pares = superseriesDe(w)
    await db.workouts.update(workoutId, {
      ordenEjercicios: ordenTrasSustituir(visibles, de, nuevo, deSigue),
      ejerciciosOmitidos: omitidos.length ? omitidos : undefined,
      ...(!deSigue && pares.some(p => p.includes(de)) ? { superseries: pares.map(p => p.map(id => (id === de ? nuevo : id)) as unknown as Superserie) } : {}),
    })
    return { workoutId, de, nuevo, movidas, creadas, orden: { ordenEjercicios: w.ordenEjercicios, ejerciciosOmitidos: w.ejerciciosOmitidos, superseries: pares.length ? pares : undefined }, ...(rutina ? { rutina } : {}) }
  })
}

/** Deshace `sustituirEnSesion`: las series vuelven al ejercicio anterior con sus ids y valores, y el orden y la rutina a los de antes. */
export function deshacerSustitucion(c: Sustitucion): Promise<void> {
  return db.transaction('rw', db.workouts, db.sets, db.routines, async () => {
    const w = await db.workouts.get(c.workoutId)
    if (!w) throw new Error('El entreno ya no está disponible.')
    await db.sets.bulkDelete(c.creadas)
    await db.sets.bulkPut(c.movidas)
    await db.workouts.update(c.workoutId, { ordenEjercicios: c.orden.ordenEjercicios, ejerciciosOmitidos: c.orden.ejerciciosOmitidos, ...{ superseries: c.orden.superseries } })
    if (c.rutina) await db.routines.put(c.rutina)
  })
}

/** Las superseries de la sesión (A21): las que se unan o separen en el entreno; la rutina no cambia. */
export function guardarSuperseries(workoutId: number, pares: Superserie[]): Promise<void> {
  return db.transaction('rw', db.workouts, async () => {
    const w = await db.workouts.get(workoutId)
    if (!w || w.fin !== undefined) throw new Error('El entreno ya no está en curso.')
    await db.workouts.update(workoutId, { ...{ superseries: pares.length ? pares : undefined } })
  })
}
