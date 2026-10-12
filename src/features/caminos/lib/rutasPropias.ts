// Rutas propias de Caminos: validación y conversión a `Ruta` para el motor. Funciones puras.
import type { PuntoRecorrido, PuntoRuta, RutaPropia } from '../../../shared/db/types'
import { formatInt } from '../../../shared/lib/format'
import { distanciaM } from '../../actividades/lib/geo'
import { indiceParaInsertar, kmTramo, proponerParadas, type Lugar } from './lugares'
import type { Ruta } from './rutas'

/** Prefijo de los ids de las rutas propias en `Settings.caminos.ruta` («propia:3»), para no chocar con las de `RUTAS`. */
export const PREFIJO = 'propia:'

export const idDeRutaPropia = (id: number) => `${PREFIJO}${id}`
export const esRutaPropia = (id: string) => id.startsWith(PREFIJO)

/** Una ruta propia como `Ruta` del motor, en la colección «Tus rutas». */
export function aRuta(r: RutaPropia): Ruta {
  return {
    id: idDeRutaPropia(r.id),
    nombre: r.nombre,
    zona: 'Tu ruta',
    desde: r.salida.nombre,
    coleccion: 'propia',
    etapas: r.etapas.map((e) => ({ hasta: e.nombre, km: e.km })),
  }
}

export const MAX_KM_ETAPA = 2000
export const MAX_ETAPAS = 200

export interface BorradorRuta {
  nombre: string
  salida: PuntoRuta | null
  etapas: (PuntoRuta & { km: number | undefined })[]
}

/** Error que impide guardar, en una frase, o `null`. */
export function validarRutaPropia(b: BorradorRuta): string | null {
  if (!b.salida?.nombre.trim()) return 'Elige el lugar de salida.'
  if (b.etapas.length === 0) return 'Elige el lugar de llegada.'
  if (b.etapas.length > MAX_ETAPAS) return `Como mucho ${formatInt(MAX_ETAPAS)} etapas.`
  for (const e of b.etapas) {
    if (!e.nombre.trim()) return 'Cada parada necesita un nombre.'
    if (e.km === undefined || !(e.km > 0)) return `Indica los km hasta ${e.nombre}.`
    if (e.km > MAX_KM_ETAPA) return `Como mucho ${formatInt(MAX_KM_ETAPA)} km por etapa.`
  }
  if (!b.nombre.trim()) return 'Ponle un nombre a la ruta.'
  return null
}

/** ¿Son el mismo sitio? Con coordenadas, a menos de 500 m; sin ellas, el mismo nombre. */
export function mismoSitio(a: PuntoRuta | null | undefined, b: PuntoRuta | null | undefined): boolean {
  if (!a || !b) return false
  if (conCoordenadas(a) && conCoordenadas(b)) return distanciaM([a.lat, a.lon], [b.lat, b.lon]) < 500
  return a.nombre.trim() === b.nombre.trim()
}

/**
 * Nombre por defecto: «Tarragona – Valencia»; en una ruta de ida y vuelta, con sus paradas («Tarragona – Reus –
 * Tarragona»; con más de dos, «Tarragona – Reus – Valls – … – Tarragona»).
 */
export function nombrePorDefecto(salida: PuntoRuta | null, etapas: readonly PuntoRuta[]): string {
  const llegada = etapas[etapas.length - 1]
  if (!salida || !llegada) return ''
  const paradas = etapas.slice(0, -1).map((e) => e.nombre)
  if (!mismoSitio(salida, llegada) || paradas.length === 0) return `${salida.nombre} – ${llegada.nombre}`
  return [salida.nombre, ...paradas.slice(0, 2), ...(paradas.length > 2 ? ['…'] : []), llegada.nombre].join(' – ')
}

// ── Edición de las etapas ──

export type EtapaBorrador = BorradorRuta['etapas'][number]

const conCoordenadas = (p: PuntoRuta | undefined): p is PuntoRuta & { lat: number; lon: number } => p?.lat !== undefined && p?.lon !== undefined

/** Un lugar de la lista como punto de la ruta. */
export const aPunto = (l: Lugar): PuntoRuta => ({ nombre: l.nombre, provincia: l.provincia, lat: l.lat, lon: l.lon })

/** Etapas propuestas de la salida a la llegada, con sus km. */
export function etapasPropuestas(salida: Lugar, llegada: Lugar, lugares: readonly Lugar[], cadaKm: number): EtapaBorrador[] {
  const puntos = [...proponerParadas(salida, llegada, lugares, cadaKm), llegada]
  return puntos.map((p, i) => ({ ...aPunto(p), km: kmTramo(i === 0 ? salida : puntos[i - 1], p) }))
}

/** Km de un tramo entre dos puntos con coordenadas, o `alternativa` si alguno no las tiene. */
function kmEntre(a: PuntoRuta | undefined, b: PuntoRuta | undefined, alternativa: number | undefined): number | undefined {
  return conCoordenadas(a) && conCoordenadas(b) ? kmTramo(a, b) : alternativa
}

/** Quita la parada `i` (no la llegada): el tramo que queda va de la anterior a la siguiente. */
export function quitarParada(salida: PuntoRuta, etapas: readonly EtapaBorrador[], i: number): EtapaBorrador[] {
  if (i < 0 || i >= etapas.length - 1) return [...etapas]
  const anterior = i === 0 ? salida : etapas[i - 1]
  const siguiente = etapas[i + 1]
  const suma = (etapas[i].km ?? 0) + (siguiente.km ?? 0)
  const unida = { ...siguiente, km: kmEntre(anterior, siguiente, suma || undefined) }
  return [...etapas.slice(0, i), unida, ...etapas.slice(i + 2)]
}

/**
 * Añade una parada entre las que hay y recalcula sus dos tramos: en su sitio de la recta salida→llegada o, si la ruta
 * vuelve a la salida (ida y vuelta, sin recta), justo antes de la llegada, en el orden en que se añaden.
 */
export function insertarParada(salida: PuntoRuta, etapas: readonly EtapaBorrador[], nueva: Lugar): EtapaBorrador[] {
  const llegada = etapas[etapas.length - 1]
  if (!conCoordenadas(salida) || !conCoordenadas(llegada)) return [...etapas.slice(0, -1), { ...aPunto(nueva), km: undefined }, llegada]
  const intermedias = etapas.slice(0, -1)
  const conCoord = intermedias.map((e) => (conCoordenadas(e) ? e : salida))
  const i = mismoSitio(salida, llegada) ? intermedias.length : indiceParaInsertar(salida, llegada, conCoord as Pick<Lugar, 'lat' | 'lon'>[], nueva)
  const anterior = i === 0 ? salida : etapas[i - 1]
  const siguiente = etapas[i]
  const punto = aPunto(nueva)
  const km = kmEntre(anterior, punto, undefined)
  const kmSiguiente = kmEntre(punto, siguiente, siguiente.km !== undefined && km !== undefined ? Math.max(0.1, siguiente.km - km) : undefined)
  return [...etapas.slice(0, i), { ...punto, km }, { ...siguiente, km: kmSiguiente }, ...etapas.slice(i + 1)]
}

/** Vuelve a la salida: la llegada actual pasa a ser una parada y la salida, la nueva llegada. */
export function anadirVuelta(salida: PuntoRuta, etapas: readonly EtapaBorrador[]): EtapaBorrador[] {
  const ultima = etapas[etapas.length - 1]
  return [...etapas, { ...salida, km: kmEntre(ultima, salida, undefined) }]
}

/** Km totales de las etapas (las vacías cuentan 0). */
export const kmTotales = (etapas: readonly EtapaBorrador[]) => Math.round(etapas.reduce((a, e) => a + (e.km ?? 0), 0) * 10) / 10

// ── Dibujo de una ruta propia ──

/** Los puntos con coordenadas de una ruta propia (salida y etapas), en orden. */
export function puntosDe(r: Pick<RutaPropia, 'salida' | 'etapas'>): PuntoRecorrido[] {
  return [r.salida, ...r.etapas].filter(conCoordenadas).map((p) => [p.lat, p.lon])
}

/**
 * Dónde se va tras `metros` por una ruta propia: interpolado en línea recta dentro de la etapa en curso según sus km, y
 * lo recorrido hasta ahí (los puntos ya pasados y la posición). `null` si alguna parada no tiene coordenadas.
 */
export function posicionEnRutaPropia(r: Pick<RutaPropia, 'salida' | 'etapas'>, metros: number): { posicion: PuntoRecorrido; recorrido: PuntoRecorrido[] } | null {
  const puntos = [r.salida, ...r.etapas]
  if (!puntos.every(conCoordenadas)) return null
  const coords = puntos.map((p): PuntoRecorrido => [p.lat!, p.lon!])
  let acumulado = 0
  for (let i = 0; i < r.etapas.length; i++) {
    const largo = Math.round(r.etapas[i].km * 1000)
    if (metros < acumulado + largo || i === r.etapas.length - 1) {
      const f = largo > 0 ? Math.min(1, Math.max(0, (metros - acumulado) / largo)) : 1
      const [a, b] = [coords[i], coords[i + 1]]
      const posicion: PuntoRecorrido = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]
      return { posicion, recorrido: [...coords.slice(0, i + 1), posicion] }
    }
    acumulado += largo
  }
  return { posicion: coords[0], recorrido: [coords[0]] }
}
