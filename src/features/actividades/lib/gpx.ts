// Lectura de archivos GPX (Strava, Wikiloc, Garmin, relojes…), sin librerías ni DOM: el formato es sencillo y así
// funciona igual en los tests (Node). Solo se leen los puntos del track (o de la ruta), su altitud y su hora.
import type { PuntoRecorrido, TipoActividad } from '../../../shared/db/types'
import { desnivelPositivo, distanciaRecorrido } from './geo'

export class GpxError extends Error {}

export interface PuntoGpx {
  lat: number
  lon: number
  ele?: number
  /** ms, si el punto trae hora. */
  t?: number
}

export interface Gpx {
  nombre?: string
  /** Texto de `<type>` tal cual (p. ej. «running», «hiking»). */
  tipo?: string
  tramos: PuntoGpx[][]
}

/** Archivo más grande que se acepta (un GPX de un día entero con un punto por segundo ronda los 10 MB). */
export const MAX_BYTES_GPX = 25 * 1024 * 1024

const ETIQUETA = (nombre: string) => `(?:[\\w-]+:)?${nombre}`
const RE_TRKSEG = new RegExp(`<${ETIQUETA('trkseg')}\\b[^>]*>([\\s\\S]*?)</${ETIQUETA('trkseg')}>`, 'g')
const RE_RTE = new RegExp(`<${ETIQUETA('rte')}\\b[^>]*>([\\s\\S]*?)</${ETIQUETA('rte')}>`, 'g')
const rePunto = (nombre: string) => new RegExp(`<${ETIQUETA(nombre)}\\b([^>]*?)(?:/>|>([\\s\\S]*?)</${ETIQUETA(nombre)}>)`, 'g')
const valor = (xml: string, nombre: string) => new RegExp(`<${ETIQUETA(nombre)}\\b[^>]*>([\\s\\S]*?)</${ETIQUETA(nombre)}>`).exec(xml)?.[1]
const atributo = (attrs: string, nombre: string) => new RegExp(`\\b${nombre}\\s*=\\s*["']([^"']+)["']`).exec(attrs)?.[1]

function texto(s: string | undefined): string | undefined {
  if (s === undefined) return undefined
  const limpio = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
    .trim()
  return limpio || undefined
}

function puntos(xml: string, nombre: string): PuntoGpx[] {
  const lista: PuntoGpx[] = []
  for (const m of xml.matchAll(rePunto(nombre))) {
    const lat = Number(atributo(m[1], 'lat'))
    const lon = Number(atributo(m[1], 'lon'))
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue
    const p: PuntoGpx = { lat, lon }
    const cuerpo = m[2] ?? ''
    const ele = Number(texto(valor(cuerpo, 'ele')))
    if (texto(valor(cuerpo, 'ele')) !== undefined && Number.isFinite(ele)) p.ele = ele
    const t = Date.parse(texto(valor(cuerpo, 'time')) ?? '')
    if (Number.isFinite(t)) p.t = t
    lista.push(p)
  }
  return lista
}

/** Lee un GPX. Lanza `GpxError` si no es un GPX o no trae ningún punto. */
export function parsearGpx(xml: string): Gpx {
  if (!/<(?:[\w-]+:)?gpx\b/.test(xml)) throw new GpxError('El archivo no es un GPX.')
  const sinMetadatos = xml.replace(/<(?:[\w-]+:)?metadata\b[\s\S]*?<\/(?:[\w-]+:)?metadata>/, '')
  const trk = new RegExp(`<${ETIQUETA('trk')}\\b[^>]*>([\\s\\S]*?)</${ETIQUETA('trk')}>`).exec(sinMetadatos)?.[1]
  let tramos = [...xml.matchAll(RE_TRKSEG)].map((m) => puntos(m[1], 'trkpt')).filter((t) => t.length > 0)
  if (tramos.length === 0) tramos = [...xml.matchAll(RE_RTE)].map((m) => puntos(m[1], 'rtept')).filter((t) => t.length > 0)
  if (tramos.length === 0) throw new GpxError('El GPX no trae ningún recorrido.')
  const cabecera = (trk ?? sinMetadatos).replace(RE_TRKSEG, '')
  const nombre = texto(valor(cabecera, 'name')) ?? texto(valor(xml, 'name'))
  const tipo = texto(valor(cabecera, 'type'))
  return { ...(nombre ? { nombre: nombre.slice(0, 120) } : {}), ...(tipo ? { tipo } : {}), tramos }
}

export interface ResumenGpx {
  nombre?: string
  tipo: TipoActividad
  /** ms del primer punto con hora, si lo hay. */
  inicio?: number
  /** Segundos del primer al último punto de cada tramo (sin contar lo que hay entre tramos); `undefined` sin horas. */
  duracionSeg?: number
  distanciaM: number
  desnivelM?: number
  recorrido: PuntoRecorrido[][]
}

const aRecorrido = (t: PuntoGpx[]): PuntoRecorrido[] => t.map((p) => (p.ele === undefined ? [p.lat, p.lon] : [p.lat, p.lon, p.ele]))

/** Velocidad media (km/h) a partir de la que una actividad sin tipo se propone como carrera. */
export const KMH_CORRER = 7.5
/** Desnivel por kilómetro (m) a partir del que se propone como senderismo. */
export const DESNIVEL_SENDERISMO_POR_KM = 30

/** Tipo propuesto: el `<type>` del archivo si se reconoce; si no, la velocidad (carrera) o el desnivel (senderismo). */
export function sugerirTipo(tipoArchivo: string | undefined, distanciaM: number, duracionSeg: number | undefined, desnivelM: number | undefined): TipoActividad {
  const t = (tipoArchivo ?? '').toLowerCase()
  if (/run|correr|carrera|trail/.test(t)) return 'correr'
  if (/hik|sender|trek|mountain|monta/.test(t)) return 'senderismo'
  if (/walk|camin|pase/.test(t)) return 'caminar'
  if (duracionSeg && duracionSeg > 0 && (distanciaM / 1000) / (duracionSeg / 3600) >= KMH_CORRER) return 'correr'
  if (desnivelM !== undefined && distanciaM > 0 && desnivelM / (distanciaM / 1000) >= DESNIVEL_SENDERISMO_POR_KM) return 'senderismo'
  return 'caminar'
}

/** Distancia, desnivel, horas y tipo propuesto de un GPX ya leído. El recorrido va sin simplificar. */
export function resumirGpx(gpx: Gpx): ResumenGpx {
  const recorrido = gpx.tramos.map(aRecorrido)
  const distanciaM = Math.round(distanciaRecorrido(recorrido))
  const desnivelM = desnivelPositivo(recorrido)
  let duracion = 0
  let conHoras = false
  for (const t of gpx.tramos) {
    const horas = t.map((p) => p.t).filter((x): x is number => x !== undefined)
    if (horas.length >= 2) { duracion += Math.max(...horas) - Math.min(...horas); conHoras = true }
  }
  const inicio = gpx.tramos.flat().find((p) => p.t !== undefined)?.t
  const duracionSeg = conHoras ? Math.round(duracion / 1000) : undefined
  return {
    ...(gpx.nombre ? { nombre: gpx.nombre } : {}),
    tipo: sugerirTipo(gpx.tipo, distanciaM, duracionSeg, desnivelM),
    ...(inicio !== undefined ? { inicio } : {}),
    ...(duracionSeg !== undefined ? { duracionSeg } : {}),
    distanciaM,
    ...(desnivelM !== undefined ? { desnivelM } : {}),
    recorrido,
  }
}
