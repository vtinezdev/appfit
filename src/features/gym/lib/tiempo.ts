// Series por tiempo (A29): planchas, isométricos o colgarse guardan segundos en lugar de repeticiones. Funciones puras.
// Decisiones de Víctor: son por tiempo los ejercicios del catálogo que lo son y cualquiera que se marque a mano; sin liga
// (no hay carga que comparar). Los récords de peso, 1RM y repeticiones no los cuentan (sus repeticiones son 0); tienen su
// propio «más tiempo».
import type { Exercise, SetEntry } from '../../../shared/db/types'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { modoCarga } from './carga'
import type { TextoAnterior } from './anterior'
import { esEfectiva } from './workout'

/**
 * Campos opcionales declarados aquí, sin tocar `shared` (como las superseries): `segundos` en la serie y `porTiempo` en el
 * ejercicio (marca a mano; `false` lo quita a uno del catálogo).
 */
export interface ConSegundos { segundos?: number }
export interface ConPorTiempo { porTiempo?: boolean }

/** Ejercicios del catálogo que se hacen por tiempo. */
export const CATALOGO_POR_TIEMPO: ReadonlySet<string> = new Set([
  'plancha', 'plancha-lateral', 'plancha-copenhague', 'plancha-inversa', 'sentadilla-pared', 'hollow-hold', 'l-sit',
  'colgar-barra', 'aduccion-balon', 'agarre-disco',
].map((slug) => `appfit:${slug}`))

/** Máximo de una serie: más de una hora seguida es una errata. */
export const MAX_SEGUNDOS = 3600

/** ¿El ejercicio es por tiempo? La marca a mano manda; sin ella, el catálogo. */
export function esPorTiempo(e: Pick<Exercise, 'catalogId'> & ConPorTiempo): boolean {
  return e.porTiempo ?? (!!e.catalogId && CATALOGO_POR_TIEMPO.has(e.catalogId))
}

/** Segundos de una serie, o 0 si no es por tiempo. */
export const segundosDe = (s: object): number => {
  const n = (s as ConSegundos).segundos
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0
}

/** Segundos válidos para guardar: enteros entre 0 y `MAX_SEGUNDOS`. */
export const segundosValidos = (n: number) => Math.min(MAX_SEGUNDOS, Math.max(0, Math.round(n)))

/** «45 s» por debajo del minuto; «1:05» desde ahí. */
export function formatSegundos(segundos: number): string {
  const s = Math.max(0, Math.round(segundos))
  return s < 60 ? `${formatInt(s)} s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Lo que marca el contador: «0:38», «1:05». */
export function formatContador(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** «45 segundos», «1 minuto y 5 segundos»: para el lector de pantalla. */
export function segundosLargo(segundos: number): string {
  const s = Math.max(0, Math.round(segundos))
  const m = Math.floor(s / 60), r = s % 60
  const seg = `${formatInt(r)} ${r === 1 ? 'segundo' : 'segundos'}`
  if (m === 0) return seg
  const min = `${formatInt(m)} ${m === 1 ? 'minuto' : 'minutos'}`
  return r === 0 ? min : `${min} y ${seg}`
}

/** Columna «Anterior» de una serie por tiempo: «45 s» o, con lastre, «45 s · +10». */
export function textoAnteriorTiempo(s: Pick<SetEntry, 'modoCarga'>, segundos: number, peso: number): TextoAnterior | undefined {
  if (!(segundos > 0)) return undefined
  const kg = peso > 0 ? formatNumber(peso, 2) : ''
  const modo = modoCarga(s)
  if (kg && modo === 'lastre') return { texto: `${formatSegundos(segundos)} · +${kg}`, etiqueta: `${segundosLargo(segundos)} con ${kg} kg de lastre` }
  if (kg && modo === 'externa') return { texto: `${formatSegundos(segundos)} · ${kg}`, etiqueta: `${segundosLargo(segundos)} con ${kg} kg` }
  return { texto: formatSegundos(segundos), etiqueta: segundosLargo(segundos) }
}

/**
 * Valores de una serie nueva de un ejercicio por tiempo: sin repeticiones y, si la anterior era por tiempo, sus segundos y
 * su carga (lastre de una plancha); si no, sin carga (no los 8 × 20 kg de una serie nueva cualquiera).
 */
export function valoresPorTiempo(previa: Pick<SetEntry, 'peso'> | undefined): { reps: 0; peso: number; segundos?: number } {
  const segundos = previa ? segundosDe(previa) : 0
  return segundos > 0 ? { reps: 0, peso: previa!.peso, segundos } : { reps: 0, peso: 0 }
}

/** ¿La serie tiene algo que marcar como hecha? Repeticiones o segundos. */
export const tieneDatos = (s: object, tieneReps: boolean) => tieneReps || segundosDe(s) > 0

/** El mejor tiempo de un ejercicio en las series efectivas realizadas, o 0. */
export function mejorTiempo(series: readonly SetEntry[], exerciseId: number): number {
  let mejor = 0
  for (const s of series) if (s.exerciseId === exerciseId && esEfectiva(s)) mejor = Math.max(mejor, segundosDe(s))
  return mejor
}

/** Objetivo del contador: el máximo del objetivo de la rutina (en segundos) o, sin él, lo de la vez anterior. */
export function objetivoSegundos(objetivo: { repsMax: number } | undefined, anterior: number): number | undefined {
  if (objetivo && objetivo.repsMax > 0) return objetivo.repsMax
  return anterior > 0 ? anterior : undefined
}

/** Segundos que marca el contador: desde `inicio` hasta `ahora`, más lo que ya llevaba. */
export const segundosContador = (inicio: number, ahora: number, previos = 0) => previos + Math.max(0, ahora - inicio) / 1000

/**
 * Récords de «más tiempo» de una sesión: por ejercicio, la serie con más segundos si supera lo mejor de las sesiones
 * anteriores. Sin anteriores no hay récord (no hay con qué comparar), como en los de peso.
 */
/** Resumen del bloque Récords con solo récords de tiempo: «Más tiempo en Plancha» o «Más tiempo en 2 ejercicios». */
export function resumenRecordsTiempo(records: readonly { exerciseId: number }[], nombres: Record<number, string>): string {
  return records.length === 1 ? `Más tiempo en ${nombres[records[0].exerciseId] ?? 'un ejercicio'}` : `Más tiempo en ${formatInt(records.length)} ejercicios`
}

export type RecordTiempo = ReturnType<typeof recordsTiempo>[number]

export function recordsTiempo(sesion: readonly SetEntry[], anteriores: readonly SetEntry[]): { exerciseId: number; segundos: number; anterior: number; setId: number }[] {
  const r: { exerciseId: number; segundos: number; anterior: number; setId: number }[] = []
  const ejercicios = new Set(sesion.filter((s) => segundosDe(s) > 0).map((s) => s.exerciseId))
  for (const id of ejercicios) {
    const anterior = mejorTiempo(anteriores, id)
    if (anterior === 0) continue
    let mejor: SetEntry | undefined
    for (const s of sesion) if (s.exerciseId === id && esEfectiva(s) && segundosDe(s) > (mejor ? segundosDe(mejor) : 0)) mejor = s
    if (mejor && segundosDe(mejor) > anterior) r.push({ exerciseId: id, segundos: segundosDe(mejor), anterior, setId: mejor.id })
  }
  return r
}
