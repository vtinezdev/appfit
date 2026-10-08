import type { SetEntry } from '../../../shared/db/types'
import { formatDiaMes } from '../../../shared/lib/dates'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { claveComparacion, contextoSerie, convencional, describirReps, volumenSerie, type SerieEjecucion } from './ejecucion'
import { cargaExterna, formatearCarga, modoCarga, type SerieCarga } from './carga'

/** 1RM estimado con la fórmula de Epley: peso * (1 + reps/30). */
export function epley1RM(peso: number, reps: number): number {
  if (reps <= 0 || peso <= 0) return 0
  if (reps === 1) return peso
  return Math.round(peso * (1 + reps / 30) * 10) / 10
}

type SerieBasica = SerieEjecucion

/** Una serie es efectiva salvo que sea de calentamiento (no cuenta en volumen, récords, mapa ni progreso). */
export function esEfectiva(s: { tipo?: SetEntry['tipo']; realizada?: boolean }): boolean {
  return s.tipo !== 'calentamiento' && s.realizada !== false
}

/** Solo las series efectivas, conservando el tipo concreto de la serie. */
export function efectivas<T extends { tipo?: SetEntry['tipo']; realizada?: boolean }>(sets: T[]): T[] {
  return sets.filter(esEfectiva)
}

export function volumenSets(sets: SerieBasica[]): number {
  return efectivas(sets).reduce((acc, s) => acc + volumenSerie(s), 0)
}

export function mejorSet(todas: SerieBasica[]): { peso: number; reps: number } | null {
  const sets = efectivas(todas).filter(s => modoCarga(s) === 'externa' && convencional(s) && !s.ejecucion && !s.excentricaSeg)
  if (sets.length === 0) return null
  return sets.reduce((best, s) => (epley1RM(s.peso, s.reps) > epley1RM(best.peso, best.reps) ? s : best))
}

export function pesoMaximo(sets: (SerieCarga & { tipo?: SetEntry['tipo'] })[]): number {
  return efectivas(sets).reduce((max, s) => Math.max(max, cargaExterna(s)), 0)
}

/** Agrupa series por workoutId, útil para gráficas de progreso por sesión. */
export function agruparPorWorkout(sets: SetEntry[]): Map<number, SetEntry[]> {
  const map = new Map<number, SetEntry[]>()
  for (const s of sets) {
    const arr = map.get(s.workoutId) ?? []
    arr.push(s)
    map.set(s.workoutId, arr)
  }
  return map
}

export function formatUltimaVez(todas: SerieBasica[]): string {
  const sets = efectivas(todas)
  if (sets.length === 0) return 'Sin datos previos'
  const grupos = new Map<string, { serie: SerieBasica; count: number }>()
  for (const serie of sets) {
    const key = JSON.stringify([serie.reps, serie.peso, modoCarga(serie), serie.pesoCorporal, claveComparacion(serie), serie.lados, serie.bajadas])
    const previo = grupos.get(key)
    grupos.set(key, { serie, count: (previo?.count ?? 0) + 1 })
  }
  return Array.from(grupos.values())
    .map(({ serie, count }) => {
      const { reps, peso } = serie, modo = modoCarga(serie), contexto = contextoSerie(serie)
      const nb = '\u00a0'
      // Espacios no separables dentro de cada grupo: «3 × 10 · 71,25 kg» no se parte entre líneas.
      const kg = modo === 'externa' ? `${formatNumber(peso, 2)}${nb}kg` : formatearCarga(serie)
      if (contexto) return [`${formatInt(count)} serie${count === 1 ? '' : 's'}`, describirReps(serie), serie.ejecucion !== 'lados' ? kg : '', contexto].filter(Boolean).join(' · ')
      return count > 1 ? `${formatInt(count)}${nb}×${nb}${formatInt(reps)}${nb}·${nb}${kg}` : `${formatInt(reps)}${nb}×${nb}${kg}`
    })
    .join(', ')
}

/** Valores por defecto de una serie nueva: repite la última serie del ejercicio o, si no hay, 8 × 20 kg. */
export function valoresNuevaSerie(previa: SerieEjecucion | undefined): Pick<SetEntry, 'reps' | 'peso' | 'modoCarga' | 'pesoCorporal' | 'ejecucion' | 'kgUnilateral' | 'agarre' | 'lados' | 'soloNegativas' | 'excentricaSeg'> {
  return { reps: previa?.reps ?? 8, peso: previa?.peso ?? 20,
    ...(previa ? { ejecucion: previa.ejecucion, kgUnilateral: previa.kgUnilateral, agarre: previa.agarre, lados: previa.lados ? Object.fromEntries(Object.entries(previa.lados).map(([lado, p]) => [lado, { reps: p.reps, peso: p.peso }])) : undefined, soloNegativas: previa.soloNegativas, excentricaSeg: previa.excentricaSeg } : {}),
    ...(previa?.modoCarga ? { modoCarga: previa.modoCarga, pesoCorporal: previa.pesoCorporal } : {}) }
}

/** `orden` de la siguiente serie: uno más que el mayor existente (no el número de series, que se repite tras borrar). */
export function siguienteOrden(sets: Pick<SetEntry, 'orden'>[]): number {
  return sets.reduce((max, s) => Math.max(max, s.orden + 1), 0)
}

/** «52 min», «1 h 05 min», «2 h». Menos de un minuto: «menos de 1 min». */
export function formatDuracion(ms: number): string {
  const min = Math.round(Math.max(0, ms) / 60000)
  if (min < 1) return 'menos de 1 min'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const resto = min % 60
  return resto === 0 ? `${h} h` : `${h} h ${String(resto).padStart(2, '0')} min`
}

/** Hora local «18:05» de una marca de tiempo. */
export function formatHora(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export interface ResumenEntreno {
  /** «Hoy», «Ayer», «Hace 3 días» o «22 sep». */
  cuando: string
  duracion: string | null
  ejercicios: number
  /** kg totales (peso × reps). */
  volumen: number
}

const DIA_MS = 86_400_000

/** Resumen de un entreno terminado para las tarjetas de Inicio y Gym: cuándo fue, cuánto duró, cuántos ejercicios y qué volumen movió. */
export function resumenUltimoEntreno(
  workout: { inicio: number; fin?: number },
  sets: (Pick<SetEntry, 'exerciseId' | 'peso' | 'reps'> & { tipo?: SetEntry['tipo'] })[],
  ahora: Date = new Date(),
): ResumenEntreno {
  const inicio = new Date(workout.inicio)
  const diaInicio = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()).getTime()
  const diaHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime()
  const dias = Math.round((diaHoy - diaInicio) / DIA_MS)
  const cuando =
    dias <= 0 ? 'Hoy' : dias === 1 ? 'Ayer' : dias < 7 ? `Hace ${dias} días` : formatDiaMes(workout.inicio)
  return {
    cuando,
    duracion: workout.fin !== undefined ? formatDuracion(workout.fin - workout.inicio) : null,
    ejercicios: new Set(efectivas(sets).map((s) => s.exerciseId)).size,
    volumen: volumenSets(sets),
  }
}

/** Línea secundaria de una sesión en el historial: «Torso · 52 min · 9.268 kg · con notas». Solo lo que existe. */
export function detalleSesion(
  workout: { inicio: number; fin?: number; notas?: string },
  rutina: string | undefined,
  sets: SerieBasica[],
): string {
  const volumen = volumenSets(sets)
  const partes = [
    rutina,
    workout.fin !== undefined ? formatDuracion(workout.fin - workout.inicio) : null,
    volumen > 0 ? `${formatInt(volumen)} kg` : null,
    workout.notas ? 'con notas' : null,
  ]
  return partes.filter(Boolean).join(' · ') || '—'
}

/**
 * Orden de los ejercicios de una sesión: los de la rutina y luego los que tienen series (como hasta ahora);
 * Excluye los omitidos solo en esta sesión. Si hay un orden manual, manda: sus ids primero
 * (los que sigan existiendo) y el resto detrás en su orden natural.
 */
export function ordenEjerciciosSesion(idsRutina: number[], idsConSeries: number[], manual?: number[], omitidos: number[] = []): number[] {
  const ocultos = new Set(omitidos)
  const base = Array.from(new Set([...idsRutina, ...idsConSeries])).filter(id => !ocultos.has(id))
  if (!manual?.length) return base
  const baseSet = new Set(base)
  const primeros = Array.from(new Set(manual)).filter((id) => baseSet.has(id))
  const resto = base.filter((id) => !primeros.includes(id))
  return [...primeros, ...resto]
}

/** Mueve el elemento `indice` una posición (`delta` -1 sube, +1 baja). Devuelve una copia; fuera de rango no cambia nada. */
export function moverElemento<T>(lista: T[], indice: number, delta: -1 | 1): T[] {
  const destino = indice + delta
  if (indice < 0 || indice >= lista.length || destino < 0 || destino >= lista.length) return [...lista]
  const copia = [...lista]
  ;[copia[indice], copia[destino]] = [copia[destino], copia[indice]]
  return copia
}

/** `YYYY-MM-DD` + `HH:MM` locales → ms; `null` si alguno no es válido. */
export function combinarFechaHora(fecha: string, hora: string): number | null {
  const f = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha)
  const h = /^(\d{1,2}):(\d{2})$/.exec(hora)
  if (!f || !h) return null
  const [y, mo, d, hh, mm] = [Number(f[1]), Number(f[2]), Number(f[3]), Number(h[1]), Number(h[2])]
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || hh > 23 || mm > 59) return null
  const date = new Date(y, mo - 1, d, hh, mm)
  return date.getMonth() === mo - 1 && date.getDate() === d ? date.getTime() : null
}

/** Duración en minutos enteros (mínimo 1) entre dos marcas de tiempo. */
export function minutosEntre(inicio: number, fin: number): number {
  return Math.max(1, Math.round((fin - inicio) / 60000))
}

/** Mensaje de error si un entreno registrado a posteriori no es válido; `null` si lo es. */
export function validarEntrenoPasado(inicio: number | null, minutos: number, ahora: number): string | null {
  if (inicio === null) return 'Indica una fecha y una hora válidas.'
  if (inicio > ahora) return 'El entreno tiene que haber empezado ya. Para uno nuevo, usa «Entreno vacío».'
  if (!Number.isFinite(minutos) || minutos < 1 || minutos > 24 * 60) return 'La duración debe estar entre 1 minuto y 24 horas.'
  return null
}
