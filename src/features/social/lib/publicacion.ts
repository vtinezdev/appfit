import { ordenarRecords } from './records'
import type { ModoCarga, ObjetivoEjercicio } from '../../../shared/db/types'
import type { TipoActividad } from '../../../shared/db/types'
import { formatInt } from '../../../shared/lib/format'
import { ZONAS_MUSCULARES, type ZonaMuscular } from '../../gym/lib/musculos'
import { LIGAS, type NombreLiga } from '../../liga/lib/liga'
import type { NivelMuscular } from '../../gym/lib/cargaMuscular'
import { IDS_LOGRO, GRUPOS_LOGRO, nivelDe, type IdLogro, type GrupoLogro, type Logro } from '../../vitrina/lib/logros'

/**
 * Lo que se publica de un entreno, una actividad, una rutina o una semana (ADR 040, 055 y 056): un resumen pequeño, sin nutrición, peso, medidas ni
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

/**
 * Un ejercicio de una rutina compartida (ADR 055): nombre, imagen del catálogo y su objetivo. Nunca cargas, marcas,
 * agarres ni notas. Sin objetivo en la rutina, solo el nombre.
 */
export interface EjercicioRutinaPublicado {
  nombre: string
  /** El ejercicio del catálogo de la app, o `null` si es propio de quien la comparte (quien la guarda elige otro). */
  catalogId: string | null
  series?: number
  repsMin?: number
  repsMax?: number
  descansoSeg?: number
  calentamientos?: number
}

export interface ResumenRutina extends ConNota {
  v: 1
  tipo: 'rutina'
  /** Nombre de la rutina. */
  titulo: string
  ejercicios: EjercicioRutinaPublicado[]
}

/**
 * Tu semana de Ritmo (ADR 056): «semana» (los siete días con o sin entreno que cuenta, entrenos frente al plan e hilo),
 * «retomando» (como mucho los entrenos de la semana) o «pausa» (nada más). Nunca kcal, peso ni días registrados.
 */
export type EstadoSemanaPublicada = 'semana' | 'retomando' | 'pausa'
export interface ResumenSemana extends ConNota {
  v: 1
  tipo: 'semana'
  /** «Semana cumplida», «2 de 3 entrenos», «Estoy retomando» o «En pausa». */
  titulo: string
  /** Lunes de la semana (YYYY-MM-DD). */
  lunes: string
  estado: EstadoSemanaPublicada
  /** Solo en «semana»: de lunes a domingo, si ese día hubo un entreno que cuenta. */
  dias?: boolean[]
  /** En «semana» y, opcional, en «retomando». */
  entrenos?: number
  /** Solo en «semana»: entrenos del plan de Ritmo de esa semana. */
  objetivo?: number
  /** Solo en «semana»: semanas seguidas del hilo de Ritmo. */
  hilo?: number
}

export type Resumen = ResumenEntreno | ResumenActividad | ResumenTexto | ResumenLogro | ResumenRutina | ResumenSemana

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

export interface DatosRutina {
  nombre: string
  ejercicios: { nombre: string; catalogId?: string; objetivo?: ObjetivoEjercicio }[]
}

/** Límites del objetivo que se publica y se acepta (los de `gym/lib/objetivos`, con margen para rutinas antiguas). */
const LIMITES_OBJETIVO = { series: [1, 20], repsMin: [1, 100], repsMax: [1, 100], descansoSeg: [15, 900], calentamientos: [1, 5] } as const

/** El objetivo publicado, o nada si alguna cifra no encaja (entonces viaja solo el nombre). */
function objetivoPublicado(o: Partial<Record<keyof typeof LIMITES_OBJETIVO, unknown>> | undefined): Omit<EjercicioRutinaPublicado, 'nombre' | 'catalogId'> {
  if (!o) return {}
  const entero = (k: keyof typeof LIMITES_OBJETIVO) => {
    const n = o[k]
    const [min, max] = LIMITES_OBJETIVO[k]
    return typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max ? n : null
  }
  const [series, repsMin, repsMax] = [entero('series'), entero('repsMin'), entero('repsMax')]
  if (series === null || repsMin === null || repsMax === null || repsMin > repsMax) return {}
  const descansoSeg = entero('descansoSeg')
  const calentamientos = entero('calentamientos')
  return { series, repsMin, repsMax, ...(descansoSeg !== null ? { descansoSeg } : {}), ...(calentamientos !== null ? { calentamientos } : {}) }
}

/** El resumen de una rutina para compartirla: su estructura, nunca cargas. Como mucho `MAX_EJERCICIOS`, sin repetir. */
export function resumenRutinaCompartida(d: DatosRutina): ResumenRutina {
  const vistos = new Set<string>()
  const ejercicios = d.ejercicios.flatMap((e) => {
    const nombre = texto(e.nombre)
    if (!nombre || vistos.has(nombre)) return []
    vistos.add(nombre)
    return [{ nombre, catalogId: catalogId(e.catalogId), ...objetivoPublicado(e.objetivo) }]
  }).slice(0, MAX_EJERCICIOS)
  return { v: VERSION_RESUMEN, tipo: 'rutina', titulo: texto(d.nombre) || 'Rutina', ejercicios }
}

export const MAX_HILO = 520
const LUNES = /^\d{4}-\d{2}-\d{2}$/
const entre = (n: unknown, min: number, max: number): n is number => typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max

/** Título de una semana publicada: lo que se lee primero en la tarjeta. */
export function tituloSemana(estado: EstadoSemanaPublicada, entrenos?: number, objetivo?: number): string {
  if (estado === 'retomando') return 'Estoy retomando'
  if (estado === 'pausa') return 'En pausa'
  if (objetivo !== undefined && entrenos !== undefined && entrenos >= objetivo) return 'Semana cumplida'
  return `${formatInt(entrenos ?? 0)} de ${formatInt(objetivo ?? 0)} ${objetivo === 1 ? 'entreno' : 'entrenos'}`
}

export type DatosSemana =
  | { estado: 'semana'; lunes: string; dias: readonly boolean[]; entrenos: number; objetivo: number; hilo: number }
  | { estado: 'retomando'; lunes: string; entrenos?: number }
  | { estado: 'pausa'; lunes: string }

/** El resumen de la semana con las cifras acotadas; en «retomando» y «pausa», nada de plan ni hilo. */
export function resumenSemana(d: DatosSemana): ResumenSemana {
  const acotar = (n: number, max: number) => Math.min(max, Math.max(0, Math.round(n)))
  if (d.estado === 'semana') {
    const entrenos = acotar(d.entrenos, 7), objetivo = Math.max(1, acotar(d.objetivo, 7))
    return { v: VERSION_RESUMEN, tipo: 'semana', titulo: tituloSemana('semana', entrenos, objetivo), lunes: d.lunes, estado: 'semana',
      dias: Array.from({ length: 7 }, (_, i) => !!d.dias[i]), entrenos, objetivo, hilo: acotar(d.hilo, MAX_HILO) }
  }
  if (d.estado === 'retomando') {
    return { v: VERSION_RESUMEN, tipo: 'semana', titulo: tituloSemana('retomando'), lunes: d.lunes, estado: 'retomando', ...(d.entrenos ? { entrenos: acotar(d.entrenos, 7) } : {}) }
  }
  return { v: VERSION_RESUMEN, tipo: 'semana', titulo: tituloSemana('pausa'), lunes: d.lunes, estado: 'pausa' }
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
  if (x.tipo === 'semana') {
    if (typeof x.lunes !== 'string' || !LUNES.test(x.lunes) || !['semana', 'retomando', 'pausa'].includes(String(x.estado))) return null
    if (x.estado === 'semana') {
      if (!Array.isArray(x.dias) || x.dias.length !== 7 || !x.dias.every(d => typeof d === 'boolean')
        || !entre(x.entrenos, 0, 7) || !entre(x.objetivo, 1, 7) || !entre(x.hilo, 0, MAX_HILO)) return null
      return { v: 1, tipo: 'semana', ...nota, titulo: tituloSemana('semana', x.entrenos, x.objetivo), lunes: x.lunes, estado: 'semana', dias: x.dias as boolean[], entrenos: x.entrenos, objetivo: x.objetivo, hilo: x.hilo }
    }
    if (x.dias !== undefined || x.objetivo !== undefined || x.hilo !== undefined) return null
    if (x.estado === 'retomando') {
      if (x.entrenos !== undefined && !entre(x.entrenos, 0, 7)) return null
      return { v: 1, tipo: 'semana', ...nota, titulo: tituloSemana('retomando'), lunes: x.lunes, estado: 'retomando', ...(x.entrenos ? { entrenos: x.entrenos as number } : {}) }
    }
    if (x.entrenos !== undefined) return null
    return { v: 1, tipo: 'semana', ...nota, titulo: tituloSemana('pausa'), lunes: x.lunes, estado: 'pausa' }
  }
  if (x.tipo === 'rutina') {
    // Una entrada mal formada invalida la rutina entera: guardarla a medias cambiaría lo que se compartió.
    if (!Array.isArray(x.ejercicios) || x.ejercicios.length < 1 || x.ejercicios.length > MAX_EJERCICIOS) return null
    const ejercicios: EjercicioRutinaPublicado[] = []
    for (const e of x.ejercicios) {
      const nombre = esObjeto(e) ? leerTexto(e.nombre) : null
      if (!esObjeto(e) || !nombre || (e.catalogId !== null && catalogId(e.catalogId) === null)) return null
      const objetivo = objetivoPublicado(e)
      if ((e.series !== undefined || e.repsMin !== undefined || e.repsMax !== undefined) && objetivo.series === undefined) return null
      ejercicios.push({ nombre, catalogId: catalogId(e.catalogId), ...objetivo })
    }
    return { v: 1, tipo: 'rutina', ...nota, titulo, ejercicios }
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
