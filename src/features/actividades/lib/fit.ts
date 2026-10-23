// Lectura de archivos FIT (Garmin, Coros, Wahoo, Suunto…), el formato binario de los relojes, con un lector propio y
// sin librerías (decisión de Víctor, A17). Solo se lee lo que necesita una actividad: la sesión (inicio, tiempo, distancia, desnivel y
// deporte), las vueltas (si no hay sesión) y los puntos (posición, altitud, hora y distancia). El resto de mensajes se
// salta. Devuelve el mismo resumen que GPX y TCX.
import { GpxError, resumirGpx, sugerirTipo, type PuntoGpx, type ResumenGpx } from './gpx'

/** «.FIT» en los bytes 8–11 de la cabecera. */
export function esFit(bytes: Uint8Array): boolean {
  return bytes.length >= 12 && bytes[8] === 0x2e && bytes[9] === 0x46 && bytes[10] === 0x49 && bytes[11] === 0x54
}

/** Segundos entre el 1-1-1970 y el origen FIT (31-12-1989 00:00 UTC). */
const ORIGEN_FIT = 631065600
const SEMICIRCULO = 180 / 2 ** 31
/** Un corte de más de dos minutos entre puntos (pausa) empieza otro tramo del recorrido. */
const PAUSA_MS = 120_000

const MENSAJE = { session: 18, lap: 19, record: 20, sport: 12 } as const
/** Deporte FIT (enum `sport`) al texto que entiende `sugerirTipo`. */
const DEPORTES: Record<number, string> = { 1: 'running', 2: 'cycling', 11: 'walking', 17: 'hiking' }

interface Campo { num: number; size: number; base: number }
interface Definicion { global: number; le: boolean; campos: Campo[]; bytesDev: number }
type Valores = Map<number, number>

/** Valor numérico de un campo (el primero si es un array) o `undefined` si es el «no válido» de su tipo. */
function leerCampo(v: DataView, o: number, c: Campo, le: boolean): number | undefined {
  const tipo = c.base & 0x1f
  const tam = [1, 1, 1, 2, 2, 4, 4, 1, 4, 8, 1, 2, 4, 1, 8, 8, 8][tipo] ?? 1
  if (c.size < tam || tipo === 7 || tipo === 13) return undefined
  switch (tipo) {
    case 0: case 2: { const n = v.getUint8(o); return n === 0xff ? undefined : n }
    case 10: { const n = v.getUint8(o); return n === 0 ? undefined : n }
    case 1: { const n = v.getInt8(o); return n === 0x7f ? undefined : n }
    case 3: { const n = v.getInt16(o, le); return n === 0x7fff ? undefined : n }
    case 4: { const n = v.getUint16(o, le); return n === 0xffff ? undefined : n }
    case 11: { const n = v.getUint16(o, le); return n === 0 ? undefined : n }
    case 5: { const n = v.getInt32(o, le); return n === 0x7fffffff ? undefined : n }
    case 6: { const n = v.getUint32(o, le); return n === 0xffffffff ? undefined : n }
    case 12: { const n = v.getUint32(o, le); return n === 0 ? undefined : n }
    case 8: { const n = v.getFloat32(o, le); return Number.isFinite(n) ? n : undefined }
    case 9: { const n = v.getFloat64(o, le); return Number.isFinite(n) ? n : undefined }
    default: return undefined
  }
}

/** Recorre los mensajes del archivo y entrega los que interesan, con sus campos ya leídos. */
function* mensajes(bytes: Uint8Array): Generator<{ global: number; valores: Valores }> {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const cabecera = bytes[0]
  const tamDatos = v.getUint32(4, true)
  const fin = Math.min(bytes.length, cabecera + tamDatos)
  const defs = new Map<number, Definicion>()
  let o = cabecera
  let ultimoTiempo = 0
  while (o < fin) {
    const h = bytes[o++]
    if (h & 0x80) {
      // Cabecera comprimida: tipo local en los bits 5–6 y los 5 bits bajos de la hora.
      const def = defs.get((h >> 5) & 0x03)
      if (!def) throw new GpxError('El FIT está dañado.')
      const desfase = h & 0x1f
      ultimoTiempo = (ultimoTiempo & ~0x1f) + desfase + (desfase >= (ultimoTiempo & 0x1f) ? 0 : 0x20)
      const valores = leerDatos(v, o, def)
      valores.set(253, ultimoTiempo)
      o += tamano(def)
      if (interesa(def.global)) yield { global: def.global, valores }
      continue
    }
    const local = h & 0x0f
    if (h & 0x40) {
      // Definición: reservado, arquitectura, mensaje global, nº de campos y los campos (y los de desarrollador).
      const le = bytes[o + 1] === 0
      const global = v.getUint16(o + 2, le)
      const n = bytes[o + 4]
      o += 5
      const campos: Campo[] = []
      for (let i = 0; i < n; i++, o += 3) campos.push({ num: bytes[o], size: bytes[o + 1], base: bytes[o + 2] })
      let bytesDev = 0
      if (h & 0x20) {
        const nd = bytes[o++]
        for (let i = 0; i < nd; i++, o += 3) bytesDev += bytes[o + 1]
      }
      defs.set(local, { global, le, campos, bytesDev })
      continue
    }
    const def = defs.get(local)
    if (!def) throw new GpxError('El FIT está dañado.')
    const valores = leerDatos(v, o, def)
    o += tamano(def)
    const t = valores.get(253)
    if (t !== undefined) ultimoTiempo = t
    if (interesa(def.global)) yield { global: def.global, valores }
  }
}

const interesa = (g: number) => g === MENSAJE.session || g === MENSAJE.lap || g === MENSAJE.record || g === MENSAJE.sport
const tamano = (d: Definicion) => d.campos.reduce((n, c) => n + c.size, 0) + d.bytesDev

function leerDatos(v: DataView, o: number, d: Definicion): Valores {
  const valores: Valores = new Map()
  let p = o
  for (const c of d.campos) {
    if (p + c.size > v.byteLength) throw new GpxError('El FIT está cortado.')
    const n = leerCampo(v, p, c, d.le)
    if (n !== undefined) valores.set(c.num, n)
    p += c.size
  }
  return valores
}

const aMs = (t: number) => (t + ORIGEN_FIT) * 1000

/**
 * Resume una actividad FIT: tiempo, distancia, inicio, desnivel y deporte de la sesión (o, sin ella, de las vueltas o de
 * los puntos) y el recorrido de los puntos con posición, partido en las pausas. Lanza `GpxError` si no es un FIT, está
 * dañado o no trae ni tiempo ni distancia.
 */
export function resumirFit(bytes: Uint8Array): ResumenGpx {
  if (!esFit(bytes) || (bytes[0] !== 12 && bytes[0] !== 14)) throw new GpxError('El archivo no es un FIT.')
  let sesion: Valores | undefined
  const vueltas: Valores[] = []
  const puntos: (PuntoGpx & { d?: number })[] = []
  const sinPosicion: { t: number; d?: number }[] = []
  let deporte: number | undefined
  for (const { global, valores } of mensajes(bytes)) {
    if (global === MENSAJE.session) sesion ??= valores
    else if (global === MENSAJE.lap) vueltas.push(valores)
    else if (global === MENSAJE.sport) deporte ??= valores.get(0)
    else {
      const t = valores.get(253)
      const lat = valores.get(0), lon = valores.get(1)
      const altitud = valores.get(78) ?? valores.get(2)
      const d = valores.get(5)
      if (lat !== undefined && lon !== undefined) {
        puntos.push({ lat: lat * SEMICIRCULO, lon: lon * SEMICIRCULO, ...(altitud !== undefined ? { ele: altitud / 5 - 500 } : {}), ...(t !== undefined ? { t: aMs(t) } : {}), ...(d !== undefined ? { d: d / 100 } : {}) })
      } else if (t !== undefined) sinPosicion.push({ t: aMs(t), ...(d !== undefined ? { d: d / 100 } : {}) })
    }
  }

  const tramos: PuntoGpx[][] = []
  for (const p of puntos) {
    const tramo = tramos.at(-1)
    const anterior = tramo?.at(-1)
    const { d, ...punto } = p
    void d
    if (!tramo || (anterior?.t !== undefined && p.t !== undefined && p.t - anterior.t > PAUSA_MS)) tramos.push([punto])
    else tramo.push(punto)
  }
  const base = tramos.length ? resumirGpx({ tramos }) : undefined

  const sumar = (k: number) => vueltas.reduce((n, v) => n + (v.get(k) ?? 0), 0)
  const horas = [...puntos, ...sinPosicion].map((p) => p.t).filter((t): t is number => t !== undefined)
  const distanciaPuntos = Math.max(0, ...[...puntos, ...sinPosicion].map((p) => p.d ?? 0))
  const distanciaM = Math.round((sesion?.get(9) ?? sumar(9)) / 100 || distanciaPuntos || (base?.distanciaM ?? 0))
  const tiempo = (sesion?.get(8) ?? sumar(8)) / 1000 || (horas.length >= 2 ? (Math.max(...horas) - Math.min(...horas)) / 1000 : 0)
  const duracionSeg = Math.round(tiempo) || undefined
  if (!distanciaM && !duracionSeg) throw new GpxError('El FIT no trae ni tiempo ni distancia.')

  const inicioSesion = sesion?.get(2)
  const inicio = inicioSesion !== undefined ? aMs(inicioSesion) : horas.length ? Math.min(...horas) : undefined
  const desnivelM = sesion?.get(22) ?? base?.desnivelM
  const tipoArchivo = DEPORTES[sesion?.get(5) ?? deporte ?? -1]
  return {
    tipo: sugerirTipo(tipoArchivo, distanciaM, duracionSeg, desnivelM),
    ...(inicio !== undefined ? { inicio } : {}),
    ...(duracionSeg !== undefined ? { duracionSeg } : {}),
    distanciaM,
    ...(desnivelM !== undefined ? { desnivelM } : {}),
    recorrido: base?.recorrido ?? [],
    ...(base?.tiempos ? { tiempos: base.tiempos } : {}),
  }
}
