// Cumbres: se sube una montaña real tras otra con la experiencia (1 XP = 1 m), desde el día en que se elige la primera
// (gaming.md, ADR 034). Derivada como el resto: nada se acumula ni se guarda salvo las montañas elegidas
// (`Settings.cumbres`), así que respeta la edición retroactiva. Sin plazo y sin poder fallar. Al hacer cumbre, los
// metros que sobran no pasan a la siguiente: empieza desde el nivel del mar con la XP que llegue después. Las montañas
// se pueden repetir: la ruta no se acaba.
import type { ConfigCumbres } from '../../../shared/db/types'
import { diasEntre } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import type { EventoXp } from '../../experiencia/lib/experiencia'
import { MONTANAS, montanaDe, type Montana } from './montanas'

/** Un hito cada 1.000 m de altitud, además de la cumbre. */
export const METROS_POR_HITO = 1000
/** Montañas que se enseñan después de la actual. */
export const SIGUIENTES = 5

/** Cuándo pasó algo y, si fue con un entreno, cuál (para mostrarlo al terminarlo). */
export interface Marca {
  fecha: string
  workoutId?: number
}

export interface HitoAlcanzado extends Marca {
  metros: number
}

/** Un capítulo: una montaña, desde el nivel del mar hasta su cima. */
export interface Expedicion {
  montana: Montana
  /** Qué vez se sube esta montaña (1 la primera; 2 si ya se coronó una vez…). */
  vez: number
  /** Día en que empezó: el inicio de Cumbres o el de la cumbre anterior. */
  desde: string
  /** Metros subidos (nunca más que la altitud). */
  metros: number
  /** Hitos de 1.000 m alcanzados, en orden. */
  hitos: HitoAlcanzado[]
  cumbre: Marca | null
}

/** Metros que subió cada XP (los que sobran al hacer cumbre se descartan). */
export interface TramoSubido extends Marca {
  metros: number
  /** De dónde sale: el tipo del evento que lo subió (`metrosPorTipo`). */
  tipo: EventoXp['tipo']
  /** Índice de la expedición en `expediciones`. */
  expedicion: number
}

export interface ResultadoCumbres {
  inicio: string
  /** Las coronadas y, al final, la actual. */
  expediciones: Expedicion[]
  actual: Expedicion
  coronadas: Expedicion[]
  /** Las `SIGUIENTES` montañas que vienen después de la actual, en el orden de la ruta. */
  siguientes: Montana[]
  metrosTotales: number
  /** En orden cronológico. */
  tramos: TramoSubido[]
}

/**
 * Las primeras `n` montañas de la ruta: las elegidas (ids válidos, en orden y con repeticiones) y después la sugerida,
 * que elige siempre la montaña coronada menos veces (a igualdad, la primera de `MONTANAS`). Así, primero van las que
 * faltan y, con todas hechas, empieza otra vuelta: la ruta no se acaba.
 */
export function rutaDe(elegidas: readonly string[], n: number): Montana[] {
  const ruta: Montana[] = []
  const veces = new Map<string, number>()
  const anadir = (m: Montana) => { ruta.push(m); veces.set(m.id, (veces.get(m.id) ?? 0) + 1) }
  for (const id of elegidas) {
    const m = montanaDe(id)
    if (m && ruta.length < n) anadir(m)
  }
  while (ruta.length < n) {
    let siguiente = MONTANAS[0]
    for (const m of MONTANAS) if ((veces.get(m.id) ?? 0) < (veces.get(siguiente.id) ?? 0)) siguiente = m
    anadir(siguiente)
  }
  return ruta
}

const workoutDe = (e: EventoXp) => (e.tipo === 'entreno' || e.tipo === 'record' ? e.workoutId : undefined)

/**
 * Recorre la XP (en orden cronológico, como la devuelve `calcularExperiencia`) desde el inicio: cada XP es un metro de
 * la montaña actual. Al llegar a su altitud se hace cumbre ese día y empieza la siguiente con la XP posterior. `null`
 * si aún no se ha elegido la primera montaña.
 */
export function calcularCumbres(eventos: readonly EventoXp[], config: ConfigCumbres | undefined): ResultadoCumbres | null {
  if (!config) return null
  // Cada XP sube como mucho una montaña (lo que sobra se pierde): no puede haber más capítulos que eventos.
  const ruta = rutaDe(config.ruta, eventos.length + 1)
  const veces = new Map<string, number>()
  const nueva = (i: number, desde: string): Expedicion => {
    const montana = ruta[i]
    const vez = (veces.get(montana.id) ?? 0) + 1
    veces.set(montana.id, vez)
    return { montana, vez, desde, metros: 0, hitos: [], cumbre: null }
  }
  let i = 0
  let actual = nueva(0, config.inicio)
  const expediciones = [actual]
  const tramos: TramoSubido[] = []
  let metrosTotales = 0

  for (const e of eventos) {
    if (e.fecha < config.inicio || !(e.xp > 0)) continue
    const workoutId = workoutDe(e)
    const marca: Marca = workoutId === undefined ? { fecha: e.fecha } : { fecha: e.fecha, workoutId }
    const { altitud } = actual.montana
    const antes = actual.metros
    const metros = Math.min(e.xp, altitud - antes)
    actual.metros += metros
    metrosTotales += metros
    tramos.push({ ...marca, metros, tipo: e.tipo, expedicion: i })
    for (let h = (Math.floor(antes / METROS_POR_HITO) + 1) * METROS_POR_HITO; h <= actual.metros && h < altitud; h += METROS_POR_HITO) {
      actual.hitos.push({ ...marca, metros: h })
    }
    if (actual.metros >= altitud) {
      actual.cumbre = marca
      i += 1
      actual = nueva(i, e.fecha)
      expediciones.push(actual)
    }
  }

  return {
    inicio: config.inicio,
    expediciones,
    actual,
    coronadas: expediciones.filter((x) => x.cumbre !== null),
    siguientes: rutaDe(config.ruta, i + 1 + SIGUIENTES).slice(i + 1),
    metrosTotales,
    tramos,
  }
}

// ── Elegir montaña ──

/** Primera montaña: Cumbres empieza hoy (no es retroactiva). */
export function empezar(hoy: string, montanaId: string): ConfigCumbres {
  return { inicio: hoy, ruta: [montanaId] }
}

/** Montañas por las que se puede cambiar la actual: cualquier otra (también las coronadas) más alta que lo ya subido. */
export function montanasParaCambiar(r: ResultadoCumbres): Montana[] {
  const { actual } = r
  return MONTANAS.filter((m) => m !== actual.montana && m.altitud > actual.metros)
}

/** Cambia la montaña actual por otra (conserva lo subido). Las coronadas no cambian. `null` si no se puede. */
export function cambiarMontana(config: ConfigCumbres, r: ResultadoCumbres, montanaId: string): ConfigCumbres | null {
  if (!montanasParaCambiar(r).some((m) => m.id === montanaId)) return null
  return { ...config, ruta: [...r.coronadas.map((c) => c.montana.id), montanaId] }
}

/** Veces que se ha coronado cada montaña. */
export function vecesCoronada(r: ResultadoCumbres): Map<string, number> {
  const veces = new Map<string, number>()
  for (const x of r.coronadas) veces.set(x.montana.id, (veces.get(x.montana.id) ?? 0) + 1)
  return veces
}

/** «1 vez», «3 veces». */
export const vecesTexto = (n: number) => (n === 1 ? '1 vez' : `${formatInt(n)} veces`)

/** Nombre de una expedición: «Aneto» la primera vez y «Aneto · 2.ª vez» al repetirla. */
export function nombreExpedicion(x: Expedicion): string {
  return x.vez > 1 ? `${x.montana.nombre} · ${formatInt(x.vez)}.ª vez` : x.montana.nombre
}

// ── Lecturas para la interfaz ──

/** Metros subidos entre dos fechas, ambas incluidas. */
export function metrosEntre(tramos: readonly TramoSubido[], desde: string, hasta: string): number {
  return tramos.reduce((a, t) => (t.fecha >= desde && t.fecha <= hasta ? a + t.metros : a), 0)
}

/** Cuánto subió un tipo de evento en un periodo: cuántas veces sumó y los metros que de verdad subieron. */
export interface MetrosDeTipo {
  tipo: EventoXp['tipo']
  veces: number
  metros: number
}

/** Nombre de cada tipo en «De dónde salen». */
export const NOMBRE_TIPO: Record<EventoXp['tipo'], string> = {
  entreno: 'Entrenos', record: 'Récords', actividad: 'Actividades', registro: 'Días registrados', proteina: 'Proteína', semana: 'Semanas cumplidas',
}

/**
 * De dónde salen los metros de un periodo (ambas fechas incluidas): por tipo, de más a menos metros. Usa los tramos, así
 * que cuadra con `metrosEntre` (lo que se pierde al hacer cumbre no cuenta). Los tipos sin metros no salen.
 */
export function metrosPorTipo(tramos: readonly TramoSubido[], desde: string, hasta: string): MetrosDeTipo[] {
  const porTipo = new Map<EventoXp['tipo'], MetrosDeTipo>()
  for (const t of tramos) {
    if (t.fecha < desde || t.fecha > hasta || !(t.metros > 0)) continue
    const m = porTipo.get(t.tipo) ?? { tipo: t.tipo, veces: 0, metros: 0 }
    m.veces += 1
    m.metros += t.metros
    porTipo.set(t.tipo, m)
  }
  return [...porTipo.values()].sort((a, b) => b.metros - a.metros)
}

export interface HitoMontana {
  metros: number
  cumbre: boolean
  alcanzado: Marca | null
}

/** Hitos de una expedición: cada 1.000 m por debajo de la cima y la cumbre, con cuándo se alcanzaron. */
export function hitosDe(x: Expedicion): HitoMontana[] {
  const hitos: HitoMontana[] = []
  for (let h = METROS_POR_HITO; h < x.montana.altitud; h += METROS_POR_HITO) {
    hitos.push({ metros: h, cumbre: false, alcanzado: x.hitos.find((a) => a.metros === h) ?? null })
  }
  hitos.push({ metros: x.montana.altitud, cumbre: true, alcanzado: x.cumbre })
  return hitos
}

/** Días que duró una expedición coronada, contando el primero y el de la cumbre. */
export function diasDeExpedicion(x: Expedicion): number | null {
  return x.cumbre ? diasEntre(x.desde, x.cumbre.fecha) + 1 : null
}

export interface CumbreDeSesion {
  /** Metros que subió el entreno (con sus récords). */
  metros: number
  cumbres: Expedicion[]
  hitos: HitoAlcanzado[]
}

/** Lo que subió un entreno concreto: metros, hitos que pasó y cumbres que hizo. */
export function cumbreDeSesion(r: ResultadoCumbres, workoutId: number): CumbreDeSesion {
  return {
    metros: r.tramos.reduce((a, t) => (t.workoutId === workoutId ? a + t.metros : a), 0),
    cumbres: r.expediciones.filter((x) => x.cumbre?.workoutId === workoutId),
    hitos: r.expediciones.flatMap((x) => x.hitos.filter((h) => h.workoutId === workoutId)),
  }
}

/** «hoy», «ayer» o «hace 2 días». */
export function cuandoFue(fecha: string, hoy: string): string {
  const dias = diasEntre(fecha, hoy)
  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'ayer'
  return `hace ${formatInt(dias)} días`
}

export const metrosTexto = (m: number) => `${formatInt(m)} m`

/** «2.340 de 3.715 m». */
export function progresoTexto(x: Expedicion): string {
  return `${formatInt(x.metros)} de ${metrosTexto(x.montana.altitud)}`
}
