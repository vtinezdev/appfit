// Revisión semanal de Inicio: la semana cerrada (lunes-domingo) frente a la anterior. Funciones puras.
import type { Agua, Entry, Exercise, Objetivos, Peso, SetEntry, Workout } from '../../../shared/db/types'
import { addDays, startOfWeek, toISODate } from '../../../shared/lib/dates'
import { formatNumber, round1 } from '../../../shared/lib/format'
import { calcularAdherencia } from '../../nutricion/lib/adherencia'
import { aggregateByDate, sumMacros } from '../../nutricion/lib/nutrition'
import { recordsDeEntreno, type RecordEjercicio } from '../../gym/lib/records'
import { resumenSemanal, type ResumenSemanal } from '../../gym/lib/resumenSemanal'

export interface Semana {
  lunes: string
  domingo: string
  /** Los 7 días, de lunes a domingo. */
  fechas: string[]
}

/** Grupos musculares que se destacan en el bloque de entreno. */
export const GRUPOS_DESTACADOS = 3

/** La semana (lunes-domingo) que empieza en el lunes de `iso`. */
export function semanaDe(iso: string): Semana {
  const lunes = startOfWeek(iso)
  const fechas = Array.from({ length: 7 }, (_, i) => addDays(lunes, i))
  return { lunes, domingo: fechas[6], fechas }
}

/** La semana que se revisa: la última cerrada, es decir, la anterior a la de `hoy`. */
export function semanaARevisar(hoy: string): Semana {
  return semanaDe(addDays(startOfWeek(hoy), -7))
}

/** La semana anterior a `semana`, con la que se compara. */
export function semanaAnterior(semana: Semana): Semana {
  return semanaDe(addDays(semana.lunes, -7))
}

/** ¿Sale la tarjeta? Solo si la semana revisada tiene datos y no se cerró ya (`cerrada` = lunes de la última cerrada). */
export function debeMostrarRevision(lunes: string, cerrada: string | undefined, hayDatos: boolean): boolean {
  return hayDatos && (cerrada === undefined || cerrada < lunes)
}

const enSemana = (s: Semana, fecha: string) => fecha >= s.lunes && fecha <= s.domingo

/** Entrenos terminados cuyo inicio cae en la semana (el mismo criterio que el resumen semanal de Gym). */
export function entrenosDeSemana<W extends Pick<Workout, 'inicio' | 'fin'>>(s: Semana, workouts: W[]): W[] {
  return workouts.filter((w) => w.fin !== undefined && enSemana(s, toISODate(new Date(w.inicio))))
}

/** ¿Hay algo registrado en la semana? Comida, pesaje, agua o un entreno terminado. */
export function hayDatosSemana(
  s: Semana,
  datos: { entries: Pick<Entry, 'fecha'>[]; pesos: Pick<Peso, 'fecha'>[]; agua: Pick<Agua, 'fecha' | 'ml'>[]; workouts: Pick<Workout, 'inicio' | 'fin'>[] },
): boolean {
  return datos.entries.some((e) => enSemana(s, e.fecha))
    || datos.pesos.some((p) => enSemana(s, p.fecha))
    || datos.agua.some((a) => enSemana(s, a.fecha) && a.ml > 0)
    || entrenosDeSemana(s, datos.workouts).length > 0
}

// ── Peso ──

export interface BloquePeso {
  /** Media de los pesajes de la semana (1 decimal); `null` sin pesajes. */
  media: number | null
  pesajes: number
  /** Media de esta semana − media de la anterior; `null` si alguna no tiene pesajes. */
  diferencia: number | null
}

function mediaPesos(s: Semana, pesos: Pick<Peso, 'fecha' | 'kg'>[]): { media: number | null; n: number } {
  const kgs = pesos.filter((p) => enSemana(s, p.fecha)).map((p) => p.kg)
  return { media: kgs.length ? kgs.reduce((a, b) => a + b, 0) / kgs.length : null, n: kgs.length }
}

/** Peso medio de la semana frente al de la anterior. La diferencia sale de las medias sin redondear. */
export function bloquePeso(s: Semana, anterior: Semana, pesos: Pick<Peso, 'fecha' | 'kg'>[]): BloquePeso {
  const actual = mediaPesos(s, pesos)
  const previa = mediaPesos(anterior, pesos)
  return {
    media: actual.media === null ? null : round1(actual.media),
    pesajes: actual.n,
    diferencia: actual.media === null || previa.media === null ? null : round1(actual.media - previa.media),
  }
}

// ── Nutrición ──

export interface BloqueNutricion {
  /** Días con algún registro (de 7). */
  diasRegistrados: number
  /** Medias de los días registrados; `null` sin días registrados. */
  kcalMedia: number | null
  protMedia: number | null
  /** Media de los objetivos de esos mismos días; `null` sin días registrados o sin objetivo. */
  kcalObjetivo: number | null
  protObjetivo: number | null
  /** % de días registrados a ±10 % de su objetivo de kcal; `null` sin días registrados. */
  adherencia: number | null
  diasEnRango: number
  /** Kcal medias − las de la semana anterior; `null` si alguna no tiene días registrados. */
  diferenciaKcal: number | null
}

type MacrosEntrada = Pick<Entry, 'fecha' | 'kcal' | 'prot' | 'carb' | 'grasa'>

function diasRegistrados(s: Semana, porDia: ReadonlyMap<string, { kcal: number }>): string[] {
  return s.fechas.filter((f) => (porDia.get(f)?.kcal ?? 0) > 0)
}

const media = (valores: number[]) => (valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null)

/**
 * Kcal y proteína medias de los días registrados, frente a la media de los objetivos de esos mismos días (cada día con
 * el suyo). Un día sin registro no cuenta: ni baja la media ni es un día fuera de rango (como en el Resumen).
 */
export function bloqueNutricion(
  s: Semana,
  anterior: Semana,
  entries: MacrosEntrada[],
  objetivos: ReadonlyMap<string, Objetivos>,
  hoy: string,
): BloqueNutricion {
  const porDia = aggregateByDate(entries as Entry[])
  const dias = diasRegistrados(s, porDia)
  const diasPrevios = diasRegistrados(anterior, porDia)
  const total = sumMacros(dias.map((f) => porDia.get(f)!))
  const kcalMedia = dias.length ? total.kcal / dias.length : null
  const previa = media(diasPrevios.map((f) => porDia.get(f)!.kcal))
  const objKcal = media(dias.map((f) => objetivos.get(f)?.kcal ?? 0))
  const objProt = media(dias.map((f) => objetivos.get(f)?.prot ?? 0))
  const kcalPorDia = new Map(dias.map((f) => [f, porDia.get(f)!.kcal]))
  const adherencia = calcularAdherencia(s.fechas, hoy, kcalPorDia, (f) => objetivos.get(f)?.kcal ?? 0)
  return {
    diasRegistrados: dias.length,
    kcalMedia: kcalMedia === null ? null : Math.round(kcalMedia),
    protMedia: dias.length ? Math.round(total.prot / dias.length) : null,
    kcalObjetivo: objKcal ? Math.round(objKcal) : null,
    protObjetivo: objProt ? Math.round(objProt) : null,
    adherencia: adherencia.porcentaje,
    diasEnRango: adherencia.diasEnRango,
    diferenciaKcal: kcalMedia === null || previa === null ? null : Math.round(kcalMedia - previa),
  }
}

// ── Entreno ──

export interface BloqueEntreno {
  actual: ResumenSemanal
  anterior: ResumenSemanal
  /** Los grupos con más series de la semana. */
  destacados: ResumenSemanal['porMusculo']
}

/** Sesiones, series, volumen, duración y grupos más trabajados, reutilizando el resumen semanal de Gym. */
export function bloqueEntreno(s: Semana, anterior: Semana, workouts: Workout[], sets: SetEntry[], exercises: Exercise[]): BloqueEntreno {
  const actual = resumenSemanal(s.lunes, s.domingo, workouts, sets, exercises)
  return {
    actual,
    anterior: resumenSemanal(anterior.lunes, anterior.domingo, workouts, sets, exercises),
    destacados: actual.porMusculo.slice(0, GRUPOS_DESTACADOS),
  }
}

/**
 * Récords conseguidos en los entrenos terminados de la semana, cada uno frente a los entrenos anteriores a él
 * (la misma detección que el resumen al terminar). En orden de entreno.
 */
export function recordsDeSemana(s: Semana, workouts: Workout[], sets: SetEntry[]): RecordEjercicio[] {
  const terminados = workouts.filter((w) => w.fin !== undefined)
  return entrenosDeSemana(s, terminados)
    .sort((a, b) => a.inicio - b.inicio)
    .flatMap((w) => recordsDeEntreno(w.id, terminados, sets))
}

// ── Agua ──

export interface BloqueAgua {
  /** Días con agua registrada (de 7). */
  dias: number
  /** Media de esos días (ml); `null` sin días. */
  mediaMl: number | null
  /** Días que llegan al objetivo; `null` sin objetivo. */
  diasEnObjetivo: number | null
  objetivoMl: number | null
}

/** Agua media de los días con registro y cuántos llegan al objetivo vigente. */
export function bloqueAgua(s: Semana, agua: Pick<Agua, 'fecha' | 'ml'>[], objetivoMl: number | null): BloqueAgua {
  const delPeriodo = agua.filter((a) => enSemana(s, a.fecha) && a.ml > 0)
  const m = media(delPeriodo.map((a) => a.ml))
  return {
    dias: delPeriodo.length,
    mediaMl: m === null ? null : Math.round(m),
    diasEnObjetivo: objetivoMl === null ? null : delPeriodo.filter((a) => a.ml >= objetivoMl).length,
    objetivoMl,
  }
}

// ── Revisión completa ──

export interface DatosRevision {
  entries: MacrosEntrada[]
  objetivos: ReadonlyMap<string, Objetivos>
  pesos: Pick<Peso, 'fecha' | 'kg'>[]
  agua: Pick<Agua, 'fecha' | 'ml'>[]
  objetivoAguaMl: number | null
  workouts: Workout[]
  sets: SetEntry[]
  exercises: Exercise[]
}

export interface Revision {
  semana: Semana
  hayDatos: boolean
  peso: BloquePeso
  nutricion: BloqueNutricion
  entreno: BloqueEntreno
  records: RecordEjercicio[]
  /** Nombre de cada ejercicio (por id), para los récords. */
  nombres: Record<number, string>
  agua: BloqueAgua
}

/** Todos los bloques de la semana que empieza en `lunes`, comparados con la semana anterior. */
export function calcularRevision(lunes: string, datos: DatosRevision, hoy: string): Revision {
  const semana = semanaDe(lunes)
  const anterior = semanaAnterior(semana)
  return {
    semana,
    hayDatos: hayDatosSemana(semana, datos),
    peso: bloquePeso(semana, anterior, datos.pesos),
    nutricion: bloqueNutricion(semana, anterior, datos.entries, datos.objetivos, hoy),
    entreno: bloqueEntreno(semana, anterior, datos.workouts, datos.sets, datos.exercises),
    records: recordsDeSemana(semana, datos.workouts, datos.sets),
    nombres: Object.fromEntries(datos.exercises.map((e) => [e.id, e.nombre])),
    agua: bloqueAgua(semana, datos.agua, datos.objetivoAguaMl),
  }
}

// ── Texto ──

/** «+0,4 kg», «−120 kcal», «+2»: diferencia con signo (menos tipográfico) y sin juicio; «Sin cambios» si es 0. */
export function formatDiferencia(n: number, decimales = 0, unidad?: string): string {
  const r = Number(n.toFixed(decimales))
  if (r === 0) return 'Sin cambios'
  return `${r < 0 ? '−' : '+'}${formatNumber(Math.abs(r), decimales)}${unidad ? ` ${unidad}` : ''}`
}
