// Caminatas, carreras y senderismo: nombres, cifras, validación y resúmenes. Funciones puras.
import type { Actividad, TipoActividad } from '../../../shared/db/types'
import { addDays, startOfWeek, toISODate } from '../../../shared/lib/dates'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { formatDuracion } from '../../gym/lib/workout'

export const TIPOS_ACTIVIDAD: readonly TipoActividad[] = ['caminar', 'correr', 'senderismo']

/** Nombre del tipo («Caminata»), para títulos y listas. */
export const NOMBRE_TIPO: Record<TipoActividad, string> = { caminar: 'Caminata', correr: 'Carrera', senderismo: 'Senderismo' }
/** Etiqueta del selector («Caminar»). */
export const ETIQUETA_TIPO: Record<TipoActividad, string> = { caminar: 'Caminar', correr: 'Correr', senderismo: 'Senderismo' }

/** Título de una actividad: su nombre (del GPX o puesto a mano) o el del tipo. */
export function tituloActividad(a: Pick<Actividad, 'tipo' | 'nombre'>): string {
  return a.nombre?.trim() || NOMBRE_TIPO[a.tipo]
}

/** Kilómetros con dos decimales por debajo de 10 y uno desde ahí: «5,24», «12,4». */
export function formatKm(metros: number): string {
  const km = Math.max(0, metros) / 1000
  return formatNumber(km, km < 10 ? 2 : 1)
}

/** «5,24 km». */
export const kmTexto = (metros: number) => `${formatKm(metros)} km`

/** Reloj de una grabación: «4:05», «1:02:09». */
export function formatReloj(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

/** Segundos por kilómetro, o `null` sin distancia suficiente (menos de 50 m da ritmos sin sentido). */
export function ritmoSegPorKm(duracionSeg: number, distanciaM: number): number | null {
  if (!(distanciaM >= 50) || !(duracionSeg > 0)) return null
  return duracionSeg / (distanciaM / 1000)
}

/** «5:32 /km»; «—» sin ritmo. */
export function formatRitmo(segPorKm: number | null): string {
  if (segPorKm === null || !Number.isFinite(segPorKm)) return '—'
  const total = Math.round(segPorKm)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')} /km`
}

/** Velocidad media en km/h, con un decimal: «5,2 km/h». */
export function formatVelocidad(duracionSeg: number, distanciaM: number): string {
  if (!(duracionSeg > 0)) return '—'
  return `${formatNumber(distanciaM / 1000 / (duracionSeg / 3600), 1)} km/h`
}

/** «420 m» de desnivel positivo. */
export const desnivelTexto = (m: number) => `${formatInt(m)} m`

// ── Validación ──

/** Límites para no guardar erratas: más que una ultra de montaña de un día ya no es una actividad de AppFit. */
export const MAX_KM = 300
export const MAX_HORAS = 48
export const MAX_DESNIVEL_M = 10_000
/** Velocidad media máxima (km/h): por encima, casi seguro que la distancia o el tiempo están mal (o era en bici). */
export const MAX_KMH = 25

export interface DatosActividad {
  tipo: TipoActividad
  inicio: number
  duracionSeg: number
  distanciaM: number
  desnivelM?: number
}

/** Error que impide guardar, en una frase, o `null` si se puede. */
export function validarActividad(d: DatosActividad, ahora: number): string | null {
  if (!Number.isFinite(d.inicio)) return 'Indica una fecha y una hora válidas.'
  if (d.inicio > ahora) return 'La actividad no puede empezar en el futuro.'
  if (!(d.distanciaM > 0)) return 'Indica la distancia.'
  if (d.distanciaM > MAX_KM * 1000) return `Como mucho ${formatInt(MAX_KM)} km por actividad.`
  if (!(d.duracionSeg > 0)) return 'Indica la duración.'
  if (d.duracionSeg > MAX_HORAS * 3600) return `Como mucho ${formatInt(MAX_HORAS)} horas por actividad.`
  if (d.desnivelM !== undefined && (!(d.desnivelM >= 0) || d.desnivelM > MAX_DESNIVEL_M)) return `El desnivel va de 0 a ${formatInt(MAX_DESNIVEL_M)} m.`
  if ((d.distanciaM / 1000) / (d.duracionSeg / 3600) > MAX_KMH) return `Sale una media de más de ${formatInt(MAX_KMH)} km/h: revisa la distancia o la duración.`
  return null
}

/** Fecha local (YYYY-MM-DD) de un inicio. */
export const fechaDe = (inicio: number) => toISODate(new Date(inicio))

// ── Resúmenes ──

export interface ResumenActividades {
  salidas: number
  distanciaM: number
  duracionSeg: number
  desnivelM: number
}

/** Totales de las actividades con fecha entre `desde` y `hasta`, ambas incluidas. */
export function resumenEntre(actividades: readonly Actividad[], desde: string, hasta: string): ResumenActividades {
  const r: ResumenActividades = { salidas: 0, distanciaM: 0, duracionSeg: 0, desnivelM: 0 }
  for (const a of actividades) {
    if (a.enCurso || a.fecha < desde || a.fecha > hasta) continue
    r.salidas += 1
    r.distanciaM += a.distanciaM
    r.duracionSeg += a.duracionSeg
    r.desnivelM += a.desnivelM ?? 0
  }
  return r
}

/** Totales de la semana (lunes a domingo) que contiene `hoy`. */
export function resumenSemana(actividades: readonly Actividad[], hoy: string): ResumenActividades {
  const lunes = startOfWeek(hoy)
  return resumenEntre(actividades, lunes, addDays(lunes, 6))
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** «Octubre de 2026» de una fecha YYYY-MM-DD. */
export function nombreMes(fecha: string): string {
  const mes = MESES[Number(fecha.slice(5, 7)) - 1] ?? ''
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} de ${fecha.slice(0, 4)}`
}

/** Actividades terminadas agrupadas por mes (YYYY-MM), de la más reciente a la más antigua. */
export function porMes(actividades: readonly Actividad[]): { mes: string; actividades: Actividad[] }[] {
  const grupos = new Map<string, Actividad[]>()
  for (const a of [...actividades].filter((x) => !x.enCurso).sort((x, y) => y.inicio - x.inicio)) {
    const mes = a.fecha.slice(0, 7)
    const lista = grupos.get(mes)
    if (lista) lista.push(a)
    else grupos.set(mes, [a])
  }
  return [...grupos].map(([mes, lista]) => ({ mes, actividades: lista }))
}

/** Línea de cifras de una actividad: «5,24 km · 42 min · 8:01 /km». Con desnivel, lo añade. */
/** Duración legible de unos segundos: «42 min», «1 h 05 min». */
export const duracionTexto = (seg: number) => (seg > 0 ? formatDuracion(seg * 1000) : '0 min')

export function cifrasActividad(a: Pick<Actividad, 'distanciaM' | 'duracionSeg' | 'desnivelM'>): string {
  const partes = [kmTexto(a.distanciaM), duracionTexto(a.duracionSeg), formatRitmo(ritmoSegPorKm(a.duracionSeg, a.distanciaM))]
  if (a.desnivelM) partes.push(`+${desnivelTexto(a.desnivelM)}`)
  return partes.join(' · ')
}
