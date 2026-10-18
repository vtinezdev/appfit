import { ordenarRecords } from './records'
import type { ModoCarga } from '../../../shared/db/types'
import type { TipoActividad } from '../../../shared/db/types'
import { formatInt } from '../../../shared/lib/format'
import { ZONAS_MUSCULARES, type ZonaMuscular } from '../../gym/lib/musculos'
import type { NivelMuscular } from '../../gym/lib/cargaMuscular'
import { IDS_LOGRO, GRUPOS_LOGRO, nivelDe, type IdLogro, type GrupoLogro, type Logro } from '../../vitrina/lib/logros'

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
export const MAX_NOTA = 280
export const MAX_PUBLICACION = 2000
export const MAX_DESCRIPCION_LOGRO = 500
export type MapaCompartido = Record<ZonaMuscular, NivelMuscular>

export interface ResumenTexto {
  v: 1
  tipo: 'texto'
  titulo: string
  texto: string
}

interface ConNota { nota?: string }

export interface ResumenLogro extends ConNota {
  v: 1
  tipo: 'logro'
  titulo: string
  logroId: IdLogro
  grupo: GrupoLogro
  nivel: number | null
  descripcion: string
}

/** Un récord o un cambio de liga: el ejercicio y qué consiguió («100 kg × 5», «Sube a Plata»). */
export interface LineaLogro {
  ejercicio: string
  texto: string
  tipo?: 'peso' | '1rm' | 'reps' | 'asistencia'
  modo?: ModoCarga
  valor?: number
  anterior?: number
  peso?: number
  variante?: string
}

export interface ResumenEntreno extends ConNota {
  v: 1
  tipo: 'entreno'
  /** Nombre de la rutina o «Entreno libre». */
  titulo: string
  duracionSeg?: number
  series: number
  volumenKg?: number
  ejercicios: string[]
  records: LineaLogro[]
  recordsTotal?: number
  recordsEjercicios?: number
  ligas: LineaLogro[]
  /** Piezas nuevas de la Vitrina. */
  logros: string[]
  /** Solo niveles por zona: nunca medidas, sexo, pesos, ejercicios privados ni datos de Perfil. */
  mapa?: MapaCompartido
}

export interface ResumenActividad extends ConNota {
  v: 1
  tipo: 'actividad'
  actividad: TipoActividad
  titulo: string
  duracionSeg?: number
  distanciaM: number
  desnivelM: number | null
}

export type Resumen = ResumenEntreno | ResumenActividad | ResumenTexto | ResumenLogro

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
const linea = (l: LineaLogro): LineaLogro => ({ ejercicio: texto(l.ejercicio), texto: texto(l.texto),
  ...(l.tipo && l.modo && l.valor !== undefined && l.anterior !== undefined ? {
    tipo: l.tipo, modo: l.modo, valor: l.valor, anterior: l.anterior,
    ...(l.peso !== undefined ? { peso: l.peso } : {}), ...(l.variante ? { variante: texto(l.variante) } : {}),
  } : {}),
})

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
  mapa?: MapaCompartido
}

/** El resumen de un entreno: textos recortados, listas acotadas y cifras redondeadas. */
export function resumenEntreno(d: DatosEntreno): ResumenEntreno {
  const ejercicios = [...new Set(d.ejercicios.map(texto).filter(Boolean))]
  const mapa = leerMapa(d.mapa)
  const records = ordenarRecords(d.records)
  return {
    v: VERSION_RESUMEN,
    tipo: 'entreno',
    titulo: texto(d.titulo) || 'Entreno',
    duracionSeg: cifra((d.fin - d.inicio) / 1000),
    series: cifra(d.series),
    volumenKg: cifra(d.volumenKg),
    ejercicios: ejercicios.slice(0, MAX_EJERCICIOS),
    records: records.slice(0, MAX_LINEAS).map(linea),
    recordsTotal: records.length,
    recordsEjercicios: new Set(records.map(r => r.ejercicio)).size,
    ligas: d.ligas.slice(0, MAX_LINEAS).map(linea),
    logros: d.logros.map(texto).filter(Boolean).slice(0, MAX_LINEAS),
    ...(mapa ? { mapa } : {}),
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
    if (!ejercicio || !t) return []
    const estructurado = ['peso', '1rm', 'reps', 'asistencia'].includes(String(l.tipo))
      && ['externa', 'corporal', 'lastre', 'asistencia'].includes(String(l.modo))
      && typeof l.valor === 'number' && Number.isFinite(l.valor) && l.valor >= 0
      && typeof l.anterior === 'number' && Number.isFinite(l.anterior) && l.anterior >= 0
      && (l.peso === undefined || (typeof l.peso === 'number' && Number.isFinite(l.peso) && l.peso >= 0))
      && (l.variante === undefined || (typeof l.variante === 'string' && !!l.variante.trim()))
    return [linea({ ejercicio, texto: t, ...(estructurado ? {
      tipo: l.tipo as LineaLogro['tipo'], modo: l.modo as ModoCarga, valor: l.valor as number, anterior: l.anterior as number,
      ...(l.peso !== undefined ? { peso: l.peso as number } : {}), ...(l.variante ? { variante: l.variante as string } : {}),
    } : {}) })]
  }).slice(0, MAX_LINEAS)

/** Copia solo zonas conocidas y niveles enteros. Un mapa mal formado no invalida una publicación antigua. */
export function leerMapa(x: unknown): MapaCompartido | undefined {
  if (!esObjeto(x) || !ZONAS_MUSCULARES.some((z) => Object.hasOwn(x, z))) return undefined
  const mapa = {} as MapaCompartido
  for (const z of ZONAS_MUSCULARES) {
    const n = Object.hasOwn(x, z) ? x[z] : 0
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > 5) return undefined
    mapa[z] = n as NivelMuscular
  }
  return mapa
}

export function validarPublicacion(t: string): string | null {
  if (!t.trim()) return 'Escribe tu publicación.'
  return t.trim().length > MAX_PUBLICACION ? `Como mucho ${formatInt(MAX_PUBLICACION)} caracteres.` : null
}

export function resumenTexto(t: string): ResumenTexto | null {
  return validarPublicacion(t) ? null : { v: 1, tipo: 'texto', titulo: 'Publicación', texto: t.trim() }
}

/** Solo permite compartir una pieza alcanzada, con el texto de ese nivel (no el del siguiente objetivo). */
export function resumenLogro(l: Logro, nivel: number | null = nivelDe(l) || null): ResumenLogro | null {
  if (l.umbrales) {
    if (nivel === null || !Number.isInteger(nivel) || nivel < 1 || !l.niveles[nivel - 1]) return null
  } else if (!l.veces?.length || nivel !== null) return null
  return {
    v: 1, tipo: 'logro', titulo: texto(l.nombre), logroId: l.id, grupo: l.grupo, nivel: l.umbrales && l.umbrales.length > 1 ? nivel : null,
    descripcion: (nivel !== null && l.umbrales && l.textoNivel ? l.textoNivel(l.umbrales[nivel - 1]) : l.descripcion).slice(0, MAX_DESCRIPCION_LOGRO),
  }
}

/** Un resumen válido de una versión conocida, o `null` (no se pinta). Recorta lo que venga de más. */
export function leerResumen(x: unknown): Resumen | null {
  if (!esObjeto(x) || x.v !== VERSION_RESUMEN) return null
  const titulo = leerTexto(x.titulo)
  if (titulo === null) return null
  if (x.nota !== undefined && (typeof x.nota !== 'string' || !x.nota.trim() || x.nota.length > MAX_NOTA)) return null
  const nota = typeof x.nota === 'string' ? { nota: x.nota.trim() } : {}
  if (x.tipo === 'texto') {
    if (typeof x.texto !== 'string' || validarPublicacion(x.texto)) return null
    return { v: 1, tipo: 'texto', titulo, texto: x.texto.trim() }
  }
  if (x.tipo === 'logro') {
    if (!IDS_LOGRO.includes(x.logroId as IdLogro) || !Object.hasOwn(GRUPOS_LOGRO, String(x.grupo))) return null
    if (x.nivel !== null && (typeof x.nivel !== 'number' || !Number.isInteger(x.nivel) || x.nivel < 1 || x.nivel > 5)) return null
    if (typeof x.descripcion !== 'string' || !x.descripcion.trim() || x.descripcion.length > MAX_DESCRIPCION_LOGRO) return null
    return { v: 1, tipo: 'logro', ...nota, titulo, logroId: x.logroId as IdLogro, grupo: x.grupo as GrupoLogro, nivel: x.nivel as number | null, descripcion: x.descripcion.trim() }
  }
  const duracionSeg = x.duracionSeg === undefined ? undefined : leerCifra(x.duracionSeg)
  if (titulo === null || duracionSeg === null) return null
  if (x.tipo === 'entreno') {
    const series = leerCifra(x.series)
    const volumenKg = x.volumenKg === undefined ? undefined : leerCifra(x.volumenKg)
    const mapa = leerMapa(x.mapa)
    if (series === null || volumenKg === null) return null
    return {
      v: 1, tipo: 'entreno', ...nota, titulo, ...(duracionSeg !== undefined ? { duracionSeg } : {}), series, ...(volumenKg !== undefined ? { volumenKg } : {}),
      ejercicios: leerTextos(x.ejercicios, MAX_EJERCICIOS),
      records: leerLineas(x.records),
      ...(Number.isSafeInteger(x.recordsTotal) && (x.recordsTotal as number) >= leerLineas(x.records).length ? { recordsTotal: x.recordsTotal as number } : {}),
      ...(Number.isSafeInteger(x.recordsEjercicios) && (x.recordsEjercicios as number) >= 0 ? { recordsEjercicios: x.recordsEjercicios as number } : {}),
      ligas: leerLineas(x.ligas),
      logros: leerTextos(x.logros, MAX_LINEAS),
      ...(mapa ? { mapa } : {}),
    }
  }
  if (x.tipo === 'actividad') {
    const distanciaM = leerCifra(x.distanciaM)
    if (distanciaM === null || !TIPOS_ACTIVIDAD.includes(x.actividad as TipoActividad)) return null
    return { v: 1, tipo: 'actividad', ...nota, actividad: x.actividad as TipoActividad, titulo, ...(duracionSeg !== undefined ? { duracionSeg } : {}), distanciaM, desnivelM: leerCifra(x.desnivelM) || null }
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

/** La nota se incorpora solo al resumen elegido para este envío; cada copia conserva la suya. */
export function conNota(resumen: Resumen, nota: string): Resumen {
  if (resumen.tipo === 'texto') return resumen
  const { nota: anterior, ...base } = resumen
  void anterior
  return nota.trim() ? { ...base, nota: nota.trim().slice(0, MAX_NOTA) } : base
}
