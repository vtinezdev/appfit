// Lectura de archivos TCX (Garmin Training Center: Garmin Connect, Polar, Coros, cintas…), con las mismas herramientas
// que el GPX. Se queda con la distancia y el tiempo de las vueltas del dispositivo, que son los que muestra el reloj, y
// con las posiciones para el recorrido; sin posiciones (cinta, interior) se importa sin recorrido.
import { ETIQUETA, GpxError, parsearGpx, resumirGpx, sugerirTipo, texto, valor, atributo, type PuntoGpx, type ResumenGpx } from './gpx'

const bloques = (xml: string, nombre: string) =>
  [...xml.matchAll(new RegExp(`<${ETIQUETA(nombre)}\\b([^>]*)>([\\s\\S]*?)</${ETIQUETA(nombre)}>`, 'g'))].map((m) => ({ attrs: m[1], cuerpo: m[2] }))
const sinBloques = (xml: string, nombre: string) => xml.replace(new RegExp(`<${ETIQUETA(nombre)}\\b[^>]*>[\\s\\S]*?</${ETIQUETA(nombre)}>`, 'g'), '')
const numero = (xml: string, nombre: string) => {
  const t = texto(valor(xml, nombre))
  const n = Number(t)
  return t !== undefined && Number.isFinite(n) ? n : undefined
}
const hora = (s: string | undefined) => {
  const t = Date.parse(s ?? '')
  return Number.isFinite(t) ? t : undefined
}

export const esTcx = (xml: string) => /<(?:[\w-]+:)?TrainingCenterDatabase\b/.test(xml)

interface PuntoTcx extends Partial<PuntoGpx> { distanciaM?: number }

function puntoTcx(cuerpo: string): PuntoTcx {
  const p: PuntoTcx = {}
  const t = hora(texto(valor(cuerpo, 'Time')))
  if (t !== undefined) p.t = t
  const posicion = valor(cuerpo, 'Position')
  const lat = posicion === undefined ? undefined : numero(posicion, 'LatitudeDegrees')
  const lon = posicion === undefined ? undefined : numero(posicion, 'LongitudeDegrees')
  if (lat !== undefined && lon !== undefined && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) { p.lat = lat; p.lon = lon }
  const ele = numero(cuerpo, 'AltitudeMeters')
  if (ele !== undefined) p.ele = ele
  const d = numero(cuerpo, 'DistanceMeters')
  if (d !== undefined && d >= 0) p.distanciaM = d
  return p
}

const conPosicion = (p: PuntoTcx): p is PuntoTcx & PuntoGpx => p.lat !== undefined && p.lon !== undefined

/**
 * Resume la primera actividad de un TCX: distancia y tiempo de sus vueltas (o, si no los trae, de sus puntos), inicio,
 * recorrido y desnivel de los puntos con posición y tipo propuesto a partir de `Sport`. Lanza `GpxError` si no es un
 * TCX o no trae ni tiempo ni distancia.
 */
export function resumirTcx(xml: string): ResumenGpx {
  if (!esTcx(xml)) throw new GpxError('El archivo no es un TCX.')
  const actividad = bloques(xml, 'Activity')[0]
  if (!actividad) throw new GpxError('El TCX no trae ninguna actividad.')
  const vueltas = bloques(actividad.cuerpo, 'Lap')
  const pistas = bloques(actividad.cuerpo, 'Track').map((p) => bloques(p.cuerpo, 'Trackpoint').map((tp) => puntoTcx(tp.cuerpo)))

  const tramos = pistas.map((p) => p.filter(conPosicion).map(({ lat, lon, ele, t }): PuntoGpx => ({ lat, lon, ...(ele !== undefined ? { ele } : {}), ...(t !== undefined ? { t } : {}) })))
    .filter((t) => t.length > 0)
  const base = tramos.length ? resumirGpx({ tramos }) : undefined

  const totales = vueltas.map((v) => sinBloques(v.cuerpo, 'Track'))
  const sumar = (nombre: string) => totales.reduce((s, v) => s + Math.max(0, numero(v, nombre) ?? 0), 0)
  const distanciaVueltas = sumar('DistanceMeters')
  const tiempoVueltas = sumar('TotalTimeSeconds')
  const distanciaPuntos = Math.max(0, ...pistas.flat().map((p) => p.distanciaM ?? 0))
  let tiempoPuntos = 0
  for (const p of pistas) {
    const horas = p.map((x) => x.t).filter((x): x is number => x !== undefined)
    if (horas.length >= 2) tiempoPuntos += Math.max(...horas) - Math.min(...horas)
  }

  const distanciaM = Math.round(distanciaVueltas || distanciaPuntos || (base?.distanciaM ?? 0))
  const duracionSeg = Math.round(tiempoVueltas || tiempoPuntos / 1000) || undefined
  if (!distanciaM && !duracionSeg) throw new GpxError('El TCX no trae ni tiempo ni distancia.')

  const inicio = hora(texto(valor(actividad.cuerpo, 'Id'))) ?? hora(vueltas[0] && atributo(vueltas[0].attrs, 'StartTime'))
    ?? pistas.flat().find((p) => p.t !== undefined)?.t
  const nombre = texto(valor(sinBloques(actividad.cuerpo, 'Lap'), 'Notes'))?.slice(0, 120)
  const desnivelM = base?.desnivelM
  return {
    ...(nombre ? { nombre } : {}),
    tipo: sugerirTipo(atributo(actividad.attrs, 'Sport'), distanciaM, duracionSeg, desnivelM),
    ...(inicio !== undefined ? { inicio } : {}),
    ...(duracionSeg !== undefined ? { duracionSeg } : {}),
    distanciaM,
    ...(desnivelM !== undefined ? { desnivelM } : {}),
    recorrido: base?.recorrido ?? [],
  }
}

/** Lee un GPX o un TCX según su contenido (no por la extensión, que a veces falta o miente). */
export function resumirArchivoActividad(xml: string): ResumenGpx {
  if (esTcx(xml)) return resumirTcx(xml)
  if (/<(?:[\w-]+:)?gpx\b/.test(xml)) return resumirGpx(parsearGpx(xml))
  throw new GpxError('El archivo no es un GPX, un TCX ni un FIT.')
}
