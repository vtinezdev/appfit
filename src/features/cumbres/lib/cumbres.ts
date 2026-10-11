// Cumbres: se sube una montaña real tras otra con la XP de Atributos (1 XP = 1 m), desde el día en que se elige la
// primera (gaming.md). Derivada como el resto: nada se acumula ni se guarda salvo las montañas elegidas
// (`Settings.cumbres`), así que respeta la edición retroactiva. Sin plazo y sin poder fallar. Al hacer cumbre, los
// metros que sobran no pasan a la siguiente: empieza desde el nivel del mar con la XP que llegue después.
import type { ConfigCumbres } from '../../../shared/db/types'
import { addDays, diasEntre } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import type { EventoXp } from '../../atributos/lib/atributos'
import { MONTANAS, montanaDe, type Montana } from './montanas'

/** Un hito cada 1.000 m de altitud, además de la cumbre. */
export const METROS_POR_HITO = 1000

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
  /** Índice de la expedición en `expediciones`. */
  expedicion: number
}

export interface ResultadoCumbres {
  inicio: string
  /** Las coronadas y, al final, la actual (si quedan montañas). */
  expediciones: Expedicion[]
  actual: Expedicion | null
  coronadas: Expedicion[]
  /** Montañas que vienen después de la actual, en el orden de la ruta. */
  siguientes: Montana[]
  metrosTotales: number
  /** En orden cronológico. */
  tramos: TramoSubido[]
}

/** Ruta completa: las montañas elegidas (válidas y sin repetir) y después el resto en el orden sugerido. */
export function rutaDe(elegidas: readonly string[]): Montana[] {
  const ruta: Montana[] = []
  for (const id of elegidas) {
    const m = montanaDe(id)
    if (m && !ruta.includes(m)) ruta.push(m)
  }
  return [...ruta, ...MONTANAS.filter((m) => !ruta.includes(m))]
}

const workoutDe = (e: EventoXp) => (e.tipo === 'entreno' || e.tipo === 'record' ? e.workoutId : undefined)

/**
 * Recorre la XP (en orden cronológico, como la devuelve `calcularAtributos`) desde el inicio: cada XP es un metro de la
 * montaña actual. Al llegar a su altitud se hace cumbre ese día y empieza la siguiente con la XP posterior. `null` si
 * aún no se ha elegido la primera montaña.
 */
export function calcularCumbres(eventos: readonly EventoXp[], config: ConfigCumbres | undefined): ResultadoCumbres | null {
  if (!config) return null
  const ruta = rutaDe(config.ruta)
  const nueva = (i: number, desde: string): Expedicion => ({ montana: ruta[i], desde, metros: 0, hitos: [], cumbre: null })
  const expediciones = [nueva(0, config.inicio)]
  const tramos: TramoSubido[] = []
  let i = 0
  let actual: Expedicion | null = expediciones[0]
  let metrosTotales = 0

  for (const e of eventos) {
    if (!actual) break
    if (e.fecha < config.inicio || !(e.xp > 0)) continue
    const workoutId = workoutDe(e)
    const marca: Marca = workoutId === undefined ? { fecha: e.fecha } : { fecha: e.fecha, workoutId }
    const { altitud } = actual.montana
    const antes = actual.metros
    const metros = Math.min(e.xp, altitud - antes)
    actual.metros += metros
    metrosTotales += metros
    tramos.push({ ...marca, metros, expedicion: i })
    for (let h = (Math.floor(antes / METROS_POR_HITO) + 1) * METROS_POR_HITO; h <= actual.metros && h < altitud; h += METROS_POR_HITO) {
      actual.hitos.push({ ...marca, metros: h })
    }
    if (actual.metros >= altitud) {
      actual.cumbre = marca
      i += 1
      actual = i < ruta.length ? nueva(i, e.fecha) : null
      if (actual) expediciones.push(actual)
    }
  }

  return {
    inicio: config.inicio,
    expediciones,
    actual,
    coronadas: expediciones.filter((x) => x.cumbre !== null),
    siguientes: ruta.slice(i + 1),
    metrosTotales,
    tramos,
  }
}

// ── Elegir montaña ──

/** Primera montaña: Cumbres empieza hoy (no es retroactiva). */
export function empezar(hoy: string, montanaId: string): ConfigCumbres {
  return { inicio: hoy, ruta: [montanaId] }
}

/** Montañas por las que se puede cambiar la actual: sin coronar y más altas que lo ya subido en ella. */
export function montanasParaCambiar(r: ResultadoCumbres): Montana[] {
  if (!r.actual) return []
  const { actual } = r
  return MONTANAS.filter((m) => m !== actual.montana && !r.coronadas.some((c) => c.montana === m) && m.altitud > actual.metros)
}

/** Cambia la montaña actual por otra (conserva lo subido). Las coronadas no cambian. `null` si no se puede. */
export function cambiarMontana(config: ConfigCumbres, r: ResultadoCumbres, montanaId: string): ConfigCumbres | null {
  if (!montanasParaCambiar(r).some((m) => m.id === montanaId)) return null
  return { ...config, ruta: [...r.coronadas.map((c) => c.montana.id), montanaId] }
}

// ── Lecturas para la interfaz ──

/** Metros subidos entre dos fechas, ambas incluidas. */
export function metrosEntre(tramos: readonly TramoSubido[], desde: string, hasta: string): number {
  return tramos.reduce((a, t) => (t.fecha >= desde && t.fecha <= hasta ? a + t.metros : a), 0)
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

/** Días durante los que Inicio recuerda la última cumbre (hoy, ayer y anteayer). */
export const DIAS_CUMBRE_RECIENTE = 3

/** Última cumbre si fue en los últimos días (para celebrarla en Inicio aunque no llegara con un entreno). */
export function cumbreReciente(r: ResultadoCumbres, hoy: string): Expedicion | null {
  const ultima = r.coronadas[r.coronadas.length - 1]
  return ultima?.cumbre && ultima.cumbre.fecha >= addDays(hoy, -(DIAS_CUMBRE_RECIENTE - 1)) && ultima.cumbre.fecha <= hoy ? ultima : null
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
