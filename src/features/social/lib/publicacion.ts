import type { TipoActividad } from '../../../shared/db/types'
import { formatInt } from '../../../shared/lib/format'

/**
 * Lo que se publica de un entreno o de una actividad (ADR 040): un resumen pequeño, sin nutrición, peso, medidas ni
 * recorrido GPS. Se crea aquí, la persona lo ve antes de publicarlo y se guarda tal cual en `publicaciones.resumen`.
 * Al leer los de otras personas, `leerResumen` lo valida: lo que llega del servidor no es de fiar.
 */

export const VERSION_RESUMEN = 1
/** Como mucho, por texto y por lista: así el resumen más largo posible cabe en los 8 KB que acepta el servidor. */
export const MAX_TEXTO = 60
export const MAX_EJERCICIOS = 15
export const MAX_LINEAS = 6

/** Un récord o un cambio de liga: el ejercicio y qué consiguió («100 kg × 5», «Sube a Plata»). */
export interface LineaLogro {
  ejercicio: string
  texto: string
}

export interface ResumenEntreno {
  v: 1
  tipo: 'entreno'
  /** Nombre de la rutina o «Entreno libre». */
  titulo: string
  duracionSeg: number
  series: number
  volumenKg: number
  ejercicios: string[]
  records: LineaLogro[]
  ligas: LineaLogro[]
  /** Piezas nuevas de la Vitrina. */
  logros: string[]
}

export interface ResumenActividad {
  v: 1
  tipo: 'actividad'
  actividad: TipoActividad
  titulo: string
  duracionSeg: number
  distanciaM: number
  desnivelM: number | null
}

export type Resumen = ResumenEntreno | ResumenActividad

export type TipoPublicacion = Resumen['tipo']

/** Una publicación tal como la pinta la app. */
export interface Publicacion {
  id: string
  /** ms del inicio del entreno o de la actividad. */
  fecha: number
  resumen: Resumen
}

const TIPOS_ACTIVIDAD: readonly TipoActividad[] = ['caminar', 'correr', 'senderismo']

const texto = (t: string) => {
  const limpio = t.trim().replace(/\s+/g, ' ')
  return limpio.length > MAX_TEXTO ? `${limpio.slice(0, MAX_TEXTO - 1)}…` : limpio
}
const cifra = (n: number) => (Number.isFinite(n) && n > 0 ? Math.round(n) : 0)
const linea = (l: LineaLogro): LineaLogro => ({ ejercicio: texto(l.ejercicio), texto: texto(l.texto) })

export interface DatosEntreno {
  titulo: string
  /** ms. */
  inicio: number
  fin: number
  series: number
  volumenKg: number
  ejercicios: string[]
  records: LineaLogro[]
  ligas: LineaLogro[]
  logros: string[]
}

/** El resumen de un entreno: textos recortados, listas acotadas y cifras redondeadas. */
export function resumenEntreno(d: DatosEntreno): ResumenEntreno {
  const ejercicios = [...new Set(d.ejercicios.map(texto).filter(Boolean))]
  return {
    v: VERSION_RESUMEN,
    tipo: 'entreno',
    titulo: texto(d.titulo) || 'Entreno',
    duracionSeg: cifra((d.fin - d.inicio) / 1000),
    series: cifra(d.series),
    volumenKg: cifra(d.volumenKg),
    ejercicios: ejercicios.slice(0, MAX_EJERCICIOS),
    records: d.records.slice(0, MAX_LINEAS).map(linea),
    ligas: d.ligas.slice(0, MAX_LINEAS).map(linea),
    logros: d.logros.map(texto).filter(Boolean).slice(0, MAX_LINEAS),
  }
}

export interface DatosActividad {
  tipo: TipoActividad
  titulo: string
  duracionSeg: number
  distanciaM: number
  desnivelM?: number
}

/** El resumen de una actividad: sin el recorrido, solo las cifras. */
export function resumenActividad(d: DatosActividad): ResumenActividad {
  return {
    v: VERSION_RESUMEN,
    tipo: 'actividad',
    actividad: d.tipo,
    titulo: texto(d.titulo) || 'Actividad',
    duracionSeg: cifra(d.duracionSeg),
    distanciaM: cifra(d.distanciaM),
    desnivelM: d.desnivelM !== undefined && d.desnivelM > 0 ? Math.round(d.desnivelM) : null,
  }
}

// --- Leer lo que llega del servidor ---

const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const leerTexto = (x: unknown): string | null => (typeof x === 'string' && x.trim() !== '' ? texto(x) : null)
const leerCifra = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.round(x) : null)
const leerTextos = (x: unknown, max: number): string[] =>
  (Array.isArray(x) ? x : []).map(leerTexto).filter((t): t is string => t !== null).slice(0, max)
const leerLineas = (x: unknown): LineaLogro[] =>
  (Array.isArray(x) ? x : []).flatMap((l) => {
    if (!esObjeto(l)) return []
    const ejercicio = leerTexto(l.ejercicio)
    const t = leerTexto(l.texto)
    return ejercicio && t ? [{ ejercicio, texto: t }] : []
  }).slice(0, MAX_LINEAS)

/** Un resumen válido de una versión conocida, o `null` (no se pinta). Recorta lo que venga de más. */
export function leerResumen(x: unknown): Resumen | null {
  if (!esObjeto(x) || x.v !== VERSION_RESUMEN) return null
  const titulo = leerTexto(x.titulo)
  const duracionSeg = leerCifra(x.duracionSeg)
  if (titulo === null || duracionSeg === null) return null
  if (x.tipo === 'entreno') {
    const series = leerCifra(x.series)
    const volumenKg = leerCifra(x.volumenKg)
    if (series === null || volumenKg === null) return null
    return {
      v: 1, tipo: 'entreno', titulo, duracionSeg, series, volumenKg,
      ejercicios: leerTextos(x.ejercicios, MAX_EJERCICIOS),
      records: leerLineas(x.records),
      ligas: leerLineas(x.ligas),
      logros: leerTextos(x.logros, MAX_LINEAS),
    }
  }
  if (x.tipo === 'actividad') {
    const distanciaM = leerCifra(x.distanciaM)
    if (distanciaM === null || !TIPOS_ACTIVIDAD.includes(x.actividad as TipoActividad)) return null
    return { v: 1, tipo: 'actividad', actividad: x.actividad as TipoActividad, titulo, duracionSeg, distanciaM, desnivelM: leerCifra(x.desnivelM) || null }
  }
  return null
}

/** «Press banca, Sentadilla y 3 más»: los primeros ejercicios y cuántos quedan. */
export function textoEjercicios(ejercicios: string[], visibles = 3): string {
  if (ejercicios.length <= visibles) {
    return ejercicios.length <= 1 ? (ejercicios[0] ?? '') : `${ejercicios.slice(0, -1).join(', ')} y ${ejercicios.at(-1)}`
  }
  const resto = ejercicios.length - visibles
  return `${ejercicios.slice(0, visibles).join(', ')} y ${formatInt(resto)} más`
}
