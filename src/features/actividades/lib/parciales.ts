// Parciales por km (A28): la hora de cada punto del recorrido y el ritmo de cada kilómetro. Funciones puras.
// La hora se guarda desde A28 en las grabaciones e importaciones nuevas (decisión de Víctor); las de antes no la tienen.
import type { Actividad, PuntoRecorrido } from '../../../shared/db/types'
import { distanciaM, distanciaRecorrido, indicesSimplificados, MAX_PUNTOS, redondearPunto } from './geo'

/**
 * Campo opcional de la actividad, declarado aquí sin tocar `shared` (como las superseries del gimnasio): los segundos de
 * cada punto del recorrido, con la misma forma que `recorrido` (tramo a tramo, punto a punto) y contados desde el primer
 * punto. Solo importan las diferencias. Sin él, o si no encaja con el recorrido, no hay parciales.
 */
export interface ConTiempos {
  tiempos?: number[][]
}

/** ¿Los tiempos encajan punto a punto con el recorrido? */
export function tiemposValidos(recorrido: readonly (readonly PuntoRecorrido[])[] | undefined, tiempos: readonly (readonly number[])[] | undefined): tiempos is number[][] {
  if (!recorrido?.length || !tiempos || tiempos.length !== recorrido.length) return false
  return recorrido.every((t, i) => tiempos[i]?.length === t.length && tiempos[i].every(Number.isFinite))
}

/**
 * Tiempos para guardar a partir de horas en ms (de un archivo o del GPS): segundos desde `origen` con un decimal. Sin
 * hora en algún punto, `undefined` (sin parciales, mejor que unos falsos).
 */
export function tiemposDesde(horas: readonly (readonly (number | undefined)[])[], origen: number): number[][] | undefined {
  if (!horas.length || horas.some((t) => t.some((h) => h === undefined || !Number.isFinite(h)))) return undefined
  return horas.map((t) => t.map((h) => Math.round(((h as number) - origen) / 100) / 10))
}

/** Simplifica recorrido y tiempos a la vez, quedándose con la hora de los mismos puntos. */
export function simplificarConTiempos(recorrido: readonly (readonly PuntoRecorrido[])[], tiempos: readonly (readonly number[])[] | undefined, max = MAX_PUNTOS): { recorrido: PuntoRecorrido[][]; tiempos?: number[][] } {
  const validos = tiemposValidos(recorrido as PuntoRecorrido[][], tiempos)
  const conservados = indicesSimplificados(recorrido, max, validos ? tiempos : undefined)
  const simplificado = conservados.map(({ tramo, indices }) => indices.map((i) => redondearPunto(recorrido[tramo][i])))
  if (!validos) return { recorrido: simplificado }
  return { recorrido: simplificado, tiempos: conservados.map(({ tramo, indices }) => indices.map((i) => tiempos[tramo][i])) }
}

export interface Parcial {
  /** Número del km (1, 2…); el último puede ser un resto. */
  km: number
  /** Metros del parcial: 1000, o menos en el resto. */
  metros: number
  /** Segundos en marcha del parcial. */
  segundos: number
  /** Segundos por km. */
  ritmo: number
}

/** Un resto final más corto no se enseña: su ritmo dice poco. */
export const RESTO_MINIMO_M = 100

/**
 * Parciales por km de una actividad con hora en cada punto. Cuenta el tiempo en marcha (dentro de cada tramo; lo que hay
 * entre tramos, una pausa, no cuenta) y reparte la distancia guardada (`distanciaM`, calculada con todos los puntos) en
 * proporción a la del recorrido simplificado. Vacío sin tiempos o sin al menos un km entero.
 */
export function parcialesPorKm(a: Pick<Actividad, 'recorrido' | 'distanciaM'> & ConTiempos): Parcial[] {
  const { recorrido, tiempos } = a
  if (!recorrido || !tiemposValidos(recorrido, tiempos) || a.distanciaM < 1000) return []
  const total = distanciaRecorrido(recorrido)
  if (!(total > 0)) return []
  const escala = a.distanciaM / total
  const parciales: Parcial[] = []
  let metros = 0
  let segundos = 0
  let inicioParcial = 0
  const cerrar = (m: number) => {
    const s = segundos - inicioParcial
    parciales.push({ km: parciales.length + 1, metros: m, segundos: s, ritmo: s / (m / 1000) })
    inicioParcial = segundos
  }
  recorrido.forEach((tramo, i) => {
    for (let j = 1; j < tramo.length; j++) {
      let d = distanciaM(tramo[j - 1], tramo[j]) * escala
      let dt = Math.max(0, tiempos[i][j] - tiempos[i][j - 1])
      // Un segmento puede cruzar uno o más km (un hueco del GPS se une en línea recta): se cierran con la hora interpolada.
      while (d > 0 && metros + d >= (parciales.length + 1) * 1000) {
        const falta = (parciales.length + 1) * 1000 - metros
        const parte = dt * (falta / d)
        segundos += parte
        metros += falta
        cerrar(1000)
        d -= falta
        dt -= parte
      }
      metros += d
      segundos += dt
    }
  })
  const resto = Math.round(a.distanciaM - parciales.length * 1000)
  if (resto >= RESTO_MINIMO_M && segundos > inicioParcial) cerrar(resto)
  return parciales
}

/** Km del parcial más rápido (entre los de un km entero), o `null` con menos de dos. */
export function kmMasRapido(parciales: readonly Parcial[]): number | null {
  const enteros = parciales.filter((p) => p.metros === 1000)
  if (enteros.length < 2) return null
  const mejor = enteros.reduce((m, p) => (p.ritmo < m.ritmo ? p : m))
  // Si otro km iguala su ritmo al segundo, no hay uno más rápido que señalar.
  return enteros.some((p) => p !== mejor && Math.round(p.ritmo) === Math.round(mejor.ritmo)) ? null : mejor.km
}
