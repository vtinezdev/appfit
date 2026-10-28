// Metas personales (B13): un récord de un ejercicio, los km de un mes o semanas cumplidas de Ritmo, con plazo opcional.
// Funciones puras: el estado (progreso, cumplida, sin cumplir) se deriva al leer; en los ajustes solo se guarda la meta.
// Nunca de peso corporal (salvaguarda del ADR 029). Si pasa el plazo: «Sin cumplir», sin rojo ni cuenta atrás.
import type { Actividad, Meta, SetEntry, Workout } from '../../../shared/db/types'
import { formatDiaMes, parseISODate, startOfWeek, toISODate } from '../../../shared/lib/dates'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { esEfectiva } from '../../gym/lib/workout'

export type TipoMeta = Meta['tipo']

export const NOMBRE_TIPO_META: Record<TipoMeta, string> = { record: 'Récord de un ejercicio', 'km-mes': 'Km de un mes', semanas: 'Semanas cumplidas' }

/** Límites para no guardar erratas. */
export const LIMITES_META: Record<TipoMeta, { min: number; max: number }> = {
  record: { min: 1, max: 1000 }, 'km-mes': { min: 1, max: 3000 }, semanas: { min: 1, max: 104 },
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** «noviembre» de un YYYY-MM. */
export const nombreMesMeta = (mes: string) => MESES[Number(mes.slice(5, 7)) - 1] ?? mes

/** Último día de un mes YYYY-MM. */
export function finDeMes(mes: string): string {
  const [y, m] = mes.split('-').map(Number)
  return toISODate(new Date(y, m, 0))
}

/** Plazo efectivo: el de la meta o, en `km-mes`, el final de su mes. */
export const plazoDe = (m: Meta): string | undefined => (m.tipo === 'km-mes' && m.mes ? finDeMes(m.mes) : m.fecha)

export interface DatosMetas {
  workouts: readonly Pick<Workout, 'id' | 'inicio' | 'fin'>[]
  sets: readonly SetEntry[]
  actividades: readonly Pick<Actividad, 'fecha' | 'distanciaM' | 'enCurso'>[]
  /** Semanas de Ritmo con su día de cumplimiento (`null` si no se cumplió). */
  semanas: readonly { lunes: string; cumplidaEl: string | null }[]
  /** Nombre de cada ejercicio, para el texto de la meta. */
  nombres: ReadonlyMap<number, string>
}

export interface EstadoMeta {
  meta: Meta
  /** «Sentadilla 100 kg», «80 km en noviembre», «12 semanas cumplidas». */
  titulo: string
  progreso: number
  objetivo: number
  /** «92,5 de 100 kg». */
  detalle: string
  /** Día en que se cumplió, o `null`. */
  cumplida: string | null
  /** Pasó el plazo sin cumplirla. */
  sinCumplir: boolean
}

/** La mejor carga (kg) de una serie efectiva hecha con repeticiones. */
const cargaSerie = (s: SetEntry) => (esEfectiva(s) && s.reps > 0 ? s.peso : 0)

function estadoRecord(m: Meta, d: DatosMetas): Pick<EstadoMeta, 'progreso' | 'cumplida'> {
  const fechas = new Map(d.workouts.filter((w) => w.fin !== undefined).map((w) => [w.id, toISODate(new Date(w.inicio))]))
  let mejor = 0
  let cumplida: string | null = null
  const series = d.sets.filter((s) => s.exerciseId === m.exerciseId && fechas.has(s.workoutId))
    .sort((a, b) => fechas.get(a.workoutId)!.localeCompare(fechas.get(b.workoutId)!))
  for (const s of series) {
    const kg = cargaSerie(s)
    mejor = Math.max(mejor, kg)
    const fecha = fechas.get(s.workoutId)!
    if (!cumplida && fecha >= m.creada && kg >= m.valor) cumplida = fecha
  }
  return { progreso: mejor, cumplida }
}

function estadoKm(m: Meta, d: DatosMetas): Pick<EstadoMeta, 'progreso' | 'cumplida'> {
  const delMes = d.actividades.filter((a) => !a.enCurso && m.mes && a.fecha.startsWith(m.mes)).sort((a, b) => a.fecha.localeCompare(b.fecha))
  let metros = 0
  let cumplida: string | null = null
  for (const a of delMes) {
    metros += a.distanciaM
    if (!cumplida && metros >= m.valor * 1000) cumplida = a.fecha
  }
  return { progreso: Math.round(metros / 100) / 10, cumplida }
}

function estadoSemanas(m: Meta, d: DatosMetas): Pick<EstadoMeta, 'progreso' | 'cumplida'> {
  const desde = startOfWeek(m.creada)
  const cumplidas = d.semanas.filter((s) => s.lunes >= desde && s.cumplidaEl !== null).map((s) => s.cumplidaEl!).sort()
  return { progreso: cumplidas.length, cumplida: cumplidas.length >= m.valor ? cumplidas[m.valor - 1] : null }
}

/** Título de la meta. */
export function tituloMeta(m: Meta, nombres: ReadonlyMap<number, string>): string {
  if (m.tipo === 'record') return `${nombres.get(m.exerciseId ?? -1) ?? 'Ejercicio'} ${formatNumber(m.valor, 2)} kg`
  if (m.tipo === 'km-mes') return `${formatInt(m.valor)} km en ${m.mes ? nombreMesMeta(m.mes) : 'un mes'}`
  return `${formatInt(m.valor)} ${m.valor === 1 ? 'semana cumplida' : 'semanas cumplidas'}`
}

/** Estado de cada meta, en el orden guardado. */
export function estadoMetas(metas: readonly Meta[], d: DatosMetas, hoy: string): EstadoMeta[] {
  return metas.map((meta) => {
    const { progreso, cumplida } = meta.tipo === 'record' ? estadoRecord(meta, d) : meta.tipo === 'km-mes' ? estadoKm(meta, d) : estadoSemanas(meta, d)
    const unidad = meta.tipo === 'record' ? ' kg' : meta.tipo === 'km-mes' ? ' km' : ''
    const plazo = plazoDe(meta)
    return {
      meta,
      titulo: tituloMeta(meta, d.nombres),
      progreso,
      objetivo: meta.valor,
      detalle: `${formatNumber(progreso, meta.tipo === 'semanas' ? 0 : 1)} de ${formatNumber(meta.valor, meta.tipo === 'record' ? 2 : 0)}${unidad}`,
      cumplida,
      sinCumplir: !cumplida && plazo !== undefined && plazo < hoy,
    }
  })
}

/** Texto del plazo o de cómo acabó: «Cumplida el 3 oct», «Antes del 31 dic», «Sin cumplir». */
export function textoPlazo(e: EstadoMeta): string | null {
  if (e.cumplida) return `Cumplida el ${formatDiaMes(parseISODate(e.cumplida).getTime())}`
  if (e.sinCumplir) return 'Sin cumplir'
  const plazo = plazoDe(e.meta)
  return plazo ? `Antes del ${formatDiaMes(parseISODate(plazo).getTime())}` : null
}

/** Proporción para la barra (0–1). */
export const proporcionMeta = (e: EstadoMeta) => (e.cumplida ? 1 : Math.max(0, Math.min(1, e.progreso / e.objetivo)))

/** Veces que se cumplió una meta, para el logro repetible «Meta cumplida» de la Vitrina. */
export const metasCumplidas = (estados: readonly EstadoMeta[]): { fecha: string }[] =>
  estados.flatMap((e) => (e.cumplida ? [{ fecha: e.cumplida }] : [])).sort((a, b) => a.fecha.localeCompare(b.fecha))

/**
 * Para la gráfica del ejercicio (cruce A-X2): la meta de récord vigente de ese ejercicio (la última sin cumplir y sin
 * pasar el plazo), o `undefined`.
 */
export function metaDeEjercicio(estados: readonly EstadoMeta[], exerciseId: number): { valor: number; fecha?: string } | undefined {
  const vigentes = estados.filter((e) => e.meta.tipo === 'record' && e.meta.exerciseId === exerciseId && !e.cumplida && !e.sinCumplir)
  const e = vigentes[vigentes.length - 1]
  return e ? { valor: e.meta.valor, ...(e.meta.fecha ? { fecha: e.meta.fecha } : {}) } : undefined
}

export interface NuevaMeta {
  tipo: TipoMeta
  valor: number
  exerciseId?: number
  mes?: string
  fecha?: string
}

/** Error que impide guardar, en una frase, o `null`. `mejorActual`: la mejor carga del ejercicio (una meta de récord la supera). */
export function validarMeta(m: NuevaMeta, hoy: string, mejorActual = 0): string | null {
  const { min, max } = LIMITES_META[m.tipo]
  if (!Number.isFinite(m.valor) || m.valor < min || m.valor > max) return `El valor va de ${formatInt(min)} a ${formatInt(max)}.`
  if (m.tipo === 'record') {
    if (m.exerciseId === undefined) return 'Elige el ejercicio.'
    if (m.valor <= mejorActual) return `Ya has levantado ${formatNumber(mejorActual, 2)} kg: pon una meta por encima.`
  }
  if (m.tipo === 'km-mes') {
    if (!m.mes || !/^\d{4}-\d{2}$/.test(m.mes)) return 'Elige el mes.'
    if (finDeMes(m.mes) < hoy) return 'Elige este mes o uno que venga.'
  }
  if (m.fecha !== undefined && m.fecha < hoy) return 'El plazo no puede estar en el pasado.'
  return null
}

/** Mejor carga de un ejercicio en su historial, para validar una meta de récord. */
export function mejorCarga(sets: readonly SetEntry[], exerciseId: number): number {
  return sets.filter((s) => s.exerciseId === exerciseId && s.realizada !== false).reduce((m, s) => Math.max(m, cargaSerie(s)), 0)
}

/**
 * Metas en curso para la tarjeta de Inicio: sin las cumplidas ni las que pasaron su plazo, de la más cerca de cumplirse a
 * la más lejos (a igualdad, el orden guardado). Vacía si no hay ninguna: entonces la tarjeta no sale.
 */
export function metasEnCurso(estados: readonly EstadoMeta[]): EstadoMeta[] {
  return estados.filter((e) => !e.cumplida && !e.sinCumplir).map((e, i) => ({ e, i, p: proporcionMeta(e) }))
    .sort((a, b) => b.p - a.p || a.i - b.i).map(({ e }) => e)
}
