import { ordenarRecords } from './records'
import type { ModoCarga } from '../../../shared/db/types'
import type { TipoActividad } from '../../../shared/db/types'
import { formatInt } from '../../../shared/lib/format'
import { ZONAS_MUSCULARES, type ZonaMuscular } from '../../gym/lib/musculos'
import { LIGAS, type NombreLiga } from '../../liga/lib/liga'
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
export const MAX_SERIES = 12
export const MAX_NOTA = 280
export const MAX_PUBLICACION = 2000
export const MAX_DESCRIPCION_LOGRO = 500
/** Lo que admite `publicaciones.resumen` (0004_publicaciones.sql). */
export const MAX_BYTES_RESUMEN = 8192
/** El resumen se publica después con una nota opcional (`conNota`): se le guarda sitio de sobra. */
const BYTES_SIN_NOTA = MAX_BYTES_RESUMEN - (MAX_NOTA * 3 + 20)
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
  /** Paralelo a `ejercicios`: el ejercicio del catálogo de la app (para su imagen) o `null` si es propio. */
  catalogIds?: (string | null)[]
  records: LineaLogro[]
  recordsTotal?: number
  recordsEjercicios?: number
  /** Publicaciones antiguas: los cambios de liga en texto. Las nuevas lo llevan vacío y la liga va en `detalles`. */
  ligas: LineaLogro[]
  /** Paralelo a `ejercicios`: lo que se ve al tocar cada uno. Las publicaciones antiguas no lo llevan. */
  detalles?: DetalleEjercicio[]
  /** Piezas nuevas de la Vitrina. */
  logros: string[]
  /** Paralelo a `logros`: qué insignia pintar. Las publicaciones antiguas no lo llevan y se quedan en texto. */
  insignias?: InsigniaPublicada[]
  /** Solo niveles por zona: nunca medidas, sexo, pesos, ejercicios privados ni datos de Perfil. */
  mapa?: MapaCompartido
}

/** Un ejercicio desplegado en la publicación. Todo opcional: lo que no cabía en los 8 KB se queda fuera. */
export interface DetalleEjercicio {
  /** La liga con la que quedó el ejercicio en la semana del entreno. */
  liga?: NombreLiga
  /** Solo si cambió de liga con este entreno: «Empieza en Bronce», «Sube a Plata»… */
  cambio?: string
  /** Series hechas, como en la ficha del entreno: «80 kg × 8». */
  series?: string[]
  /** Series que batieron un récord de carga: su índice en `series` y cuánto subió («+5 kg»). */
  records?: { serie: number; mejora: string }[]
}

export interface InsigniaPublicada {
  id: IdLogro
  grupo: GrupoLogro
  nivel: number | null
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
/** Solo ejercicios del catálogo de la app: su id es público y la imagen sale del propio origen. */
const CATALOG_ID = /^appfit:[a-z0-9-]{1,40}$/
const catalogId = (x: unknown): string | null => (typeof x === 'string' && CATALOG_ID.test(x) ? x : null)
const insignia = (x: unknown): InsigniaPublicada | null => {
  if (!esObjeto(x) || !IDS_LOGRO.includes(x.id as IdLogro) || !Object.hasOwn(GRUPOS_LOGRO, String(x.grupo))) return null
  if (x.nivel !== null && (typeof x.nivel !== 'number' || !Number.isInteger(x.nivel) || x.nivel < 1 || x.nivel > 5)) return null
  return { id: x.id as IdLogro, grupo: x.grupo as GrupoLogro, nivel: x.nivel as number | null }
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
  /** Paralelo a `ejercicios`. */
  catalogIds?: (string | undefined)[]
  records: LineaLogro[]
  /** Paralelo a `ejercicios`. */
  detalles?: DetalleEjercicio[]
  logros: string[]
  /** Paralelo a `logros`. */
  insignias?: InsigniaPublicada[]
  mapa?: MapaCompartido
}

/** Lo que ocupa en el servidor, por lo alto: JSONB añade un espacio tras cada `,` y `:` (aquí también dentro de los textos). */
export const bytesResumen = (r: Resumen): number => new TextEncoder().encode(JSON.stringify(r).replace(/[,:]/g, '$& ')).length

/**
 * El resumen de un entreno: textos recortados, listas acotadas y cifras redondeadas. Los detalles de los ejercicios
 * entran en orden mientras quepan en los 8 KB del servidor (con sitio para la nota): primero completos, si no, solo la
 * liga; lo que no cabe se queda vacío y la tarjeta enseña lo demás.
 */
export function resumenEntreno(d: DatosEntreno): ResumenEntreno {
  // Primera aparición de cada nombre: sus listas paralelas salen de ese índice.
  const porNombre = new Map<string, number>()
  d.ejercicios.forEach((e, i) => {
    const nombre = texto(e)
    if (nombre && !porNombre.has(nombre)) porNombre.set(nombre, i)
  })
  const ejercicios = [...porNombre.keys()].slice(0, MAX_EJERCICIOS)
  const catalogIds = ejercicios.map(e => catalogId(d.catalogIds?.[porNombre.get(e)!]))
  const detalles: DetalleEjercicio[] | undefined = d.detalles && ejercicios.map(() => ({}))
  const logros = d.logros.map((l, i) => ({ nombre: texto(l), insignia: insignia(d.insignias?.[i]) })).filter(l => l.nombre).slice(0, MAX_LINEAS)
  const mapa = leerMapa(d.mapa)
  const records = ordenarRecords(d.records)
  const resumen: ResumenEntreno = {
    v: VERSION_RESUMEN,
    tipo: 'entreno',
    titulo: texto(d.titulo) || 'Entreno',
    duracionSeg: cifra((d.fin - d.inicio) / 1000),
    series: cifra(d.series),
    volumenKg: cifra(d.volumenKg),
    ejercicios,
    // También todo `null` (solo ejercicios propios): marca la publicación como de mosaico, no de texto.
    ...(ejercicios.length ? { catalogIds } : {}),
    records: records.slice(0, MAX_LINEAS).map(linea),
    recordsTotal: records.length,
    recordsEjercicios: new Set(records.map(r => r.ejercicio)).size,
    ligas: [],
    ...(detalles ? { detalles } : {}),
    logros: logros.map(l => l.nombre),
    ...(logros.length && logros.every(l => l.insignia) ? { insignias: logros.map(l => l.insignia!) } : {}),
    ...(mapa ? { mapa } : {}),
  }
  detalles?.forEach((_, i) => {
    const completo = leerDetalle(d.detalles?.[porNombre.get(ejercicios[i])!])
    const soloLiga = { ...(completo.liga ? { liga: completo.liga } : {}), ...(completo.cambio ? { cambio: completo.cambio } : {}) }
    for (const opcion of [completo, soloLiga, {}]) {
      detalles[i] = opcion
      if (bytesResumen(resumen) <= BYTES_SIN_NOTA) return
    }
  })
  return resumen
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

export const NOMBRES_LIGA: readonly NombreLiga[] = [...LIGAS, 'Élite']

/** Un detalle de ejercicio limpio: lo que no encaja se descarta campo a campo, sin invalidar la publicación. */
export function leerDetalle(x: unknown): DetalleEjercicio {
  if (!esObjeto(x)) return {}
  const cambio = leerTexto(x.cambio)
  const series = leerTextos(x.series, MAX_SERIES)
  const records = (Array.isArray(x.records) ? x.records : []).flatMap((r) => {
    const mejora = esObjeto(r) ? leerTexto(r.mejora) : null
    return esObjeto(r) && mejora && Number.isInteger(r.serie) && (r.serie as number) >= 0 && (r.serie as number) < series.length
      ? [{ serie: r.serie as number, mejora }] : []
  }).slice(0, MAX_SERIES)
  return {
    ...(NOMBRES_LIGA.includes(x.liga as NombreLiga) ? { liga: x.liga as NombreLiga } : {}),
    ...(cambio ? { cambio } : {}),
    ...(series.length ? { series } : {}),
    ...(records.length ? { records } : {}),
  }
}

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
    const ejercicios = leerTextos(x.ejercicios, MAX_EJERCICIOS)
    // Las listas paralelas solo valen si ninguna entrada se descartó: si no, se desalinean.
    const alineada = (lista: unknown, base: unknown, n: number) => Array.isArray(lista) && Array.isArray(base) && lista.length === n && base.length === n
    const catalogIds = alineada(x.catalogIds, x.ejercicios, ejercicios.length) ? (x.catalogIds as unknown[]).map(catalogId) : []
    const logros = leerTextos(x.logros, MAX_LINEAS)
    const insignias = alineada(x.insignias, x.logros, logros.length) ? (x.insignias as unknown[]).map(insignia) : []
    const detalles = alineada(x.detalles, x.ejercicios, ejercicios.length) ? (x.detalles as unknown[]).map(leerDetalle) : []
    return {
      v: 1, tipo: 'entreno', ...nota, titulo, ...(duracionSeg !== undefined ? { duracionSeg } : {}), series, ...(volumenKg !== undefined ? { volumenKg } : {}),
      ejercicios,
      ...(catalogIds.length ? { catalogIds } : {}),
      records: leerLineas(x.records),
      ...(Number.isSafeInteger(x.recordsTotal) && (x.recordsTotal as number) >= leerLineas(x.records).length ? { recordsTotal: x.recordsTotal as number } : {}),
      ...(Number.isSafeInteger(x.recordsEjercicios) && (x.recordsEjercicios as number) >= 0 ? { recordsEjercicios: x.recordsEjercicios as number } : {}),
      ligas: leerLineas(x.ligas),
      ...(detalles.length ? { detalles } : {}),
      logros,
      ...(insignias.length && insignias.every(Boolean) ? { insignias: insignias as InsigniaPublicada[] } : {}),
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

/** Sin 0020 el servidor rechaza las claves nuevas: se envía sin imágenes ni insignias (la tarjeta cae a texto). */
export function sinImagenes(resumen: Resumen): Resumen {
  if (resumen.tipo !== 'entreno') return resumen
  const { catalogIds, insignias, ...base } = resumen
  void catalogIds; void insignias
  return base
}

/**
 * Sin 0021 el servidor rechaza `detalles`: se envía sin ellos y los cambios de liga vuelven a su lista de texto, que la
 * tarjeta enseña al tocar cada ejercicio. Las series no tienen otro sitio y se quedan fuera.
 */
export function sinDetalles(resumen: Resumen): Resumen {
  if (resumen.tipo !== 'entreno' || !resumen.detalles) return resumen
  const { detalles, ...base } = resumen
  const sin: ResumenEntreno = { ...base, ligas: [] }
  for (const [i, d] of detalles.entries()) {
    if (!d.cambio || sin.ligas.length >= MAX_LINEAS) continue
    const ligas = [...sin.ligas, { ejercicio: resumen.ejercicios[i], texto: d.cambio }]
    if (bytesResumen({ ...sin, ligas }) <= BYTES_SIN_NOTA) sin.ligas = ligas
  }
  return sin
}

/** La nota se incorpora solo al resumen elegido para este envío; cada copia conserva la suya. */
export function conNota(resumen: Resumen, nota: string): Resumen {
  if (resumen.tipo === 'texto') return resumen
  const { nota: anterior, ...base } = resumen
  void anterior
  return nota.trim() ? { ...base, nota: nota.trim().slice(0, MAX_NOTA) } : base
}
