// Experiencia (XP) derivada del historial (gaming.md, ADR 029 y 034): lo que suben los entrenos, los récords, las
// comidas y las semanas cumplidas. Cumbres la convierte en metros (1 XP = 1 m); la interfaz no habla de XP. Funciones
// puras: la XP no se acumula ni se guarda, se recalcula a partir de los registros. Así respeta la edición retroactiva, va en el backup sin
// cambios de esquema y borrar y volver a crear no da nada.
import type { Actividad, Entry, Pausa, SetEntry, TramoPlanSemanal, Workout } from '../../../shared/db/types'
import { startOfWeek, toISODate } from '../../../shared/lib/dates'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { kmTexto } from '../../actividades/lib/actividad'
import { acumularComparables, describirRecord, recordsFrenteA, type GruposComparables, type RecordEjercicio } from '../../gym/lib/records'
import { esEfectiva } from '../../gym/lib/workout'
import { planDeSemana } from '../../ritmo/lib/plan'
import { calcularRitmo, type ResultadoRitmo, type SemanaRitmo } from '../../ritmo/lib/ritmo'

/**
 * Versión de las reglas. Si cambian, las semanas ya cerradas deben conservar la XP de la versión con la que se ganaron.
 * v2 añade las actividades (XP por km): antes no había actividades, así que la XP ya ganada no cambia.
 */
export const VERSION_REGLAS = 2

export const XP = { entreno: 100, diaRegistrado: 30, diaUnaComida: 10, proteina: 20, semanaCumplida: 150, record: 25 } as const
/**
 * Un entreno cuenta para el plan, Ritmo y la Vitrina con al menos estas series efectivas (sin calentamiento ni series
 * marcadas como no hechas).
 */
export const SERIES_MINIMAS = 5
/** Con estas series efectivas o más, un entreno da su XP completa; con menos, la parte proporcional. */
export const SERIES_COMPLETAS = 6
export const RECORDS_POR_SESION = 3
/** Proteína del día frente a su objetivo: llegar al 90 % basta (no premia comer menos). */
export const PROPORCION_PROTEINA = 0.9
/**
 * Caminatas, carreras y senderismo: XP por kilómetro del día, con tope diario y un máximo de días por semana (lunes a
 * domingo), aparte del plan de entrenos. Un día cuenta con al menos `metrosMinimos`.
 */
export const XP_ACTIVIDAD = { porKm: 10, maxDia: 100, diasPorSemana: 3, metrosMinimos: 1000 } as const

/** XP de los metros andados o corridos en un día: 10 por km, redondeada, hasta el tope diario. */
export function xpDeActividad(distanciaM: number): number {
  return Math.min(XP_ACTIVIDAD.maxDia, Math.round((Math.max(0, distanciaM) / 1000) * XP_ACTIVIDAD.porKm))
}

interface BaseEvento {
  fecha: string
  xp: number
}

export type EventoXp =
  | BaseEvento & { tipo: 'entreno'; workoutId: number; series: number }
  | BaseEvento & { tipo: 'record'; workoutId: number; record: RecordEjercicio }
  | BaseEvento & { tipo: 'actividad'; distanciaM: number; actividadIds: number[] }
  | BaseEvento & { tipo: 'registro'; comidas: number }
  | BaseEvento & { tipo: 'proteina'; prot: number; objetivo: number }
  | BaseEvento & { tipo: 'semana'; lunes: string; estado: SemanaRitmo }

/** Por qué un entreno terminado no suma XP. */
export type MotivoSinXp = 'sin-series' | 'otro-hoy' | 'tope-semana'

export interface EntrenoSinXp {
  workoutId: number
  fecha: string
  series: number
  motivo: MotivoSinXp
  /** En `tope-semana`, los entrenos del plan de esa semana. */
  tope?: number
}

/** Un día con actividades que no suma: menos de `XP_ACTIVIDAD.metrosMinimos` o la semana ya tiene sus días. */
export interface ActividadSinXp {
  fecha: string
  distanciaM: number
  actividadIds: number[]
  motivo: 'corta' | 'tope-semana'
}

export interface DatosExperiencia {
  hoy: string
  /** Entrenos terminados (los que no tienen `fin` se ignoran). */
  workouts: Pick<Workout, 'id' | 'inicio' | 'fin'>[]
  sets: SetEntry[]
  entries: Pick<Entry, 'fecha' | 'comida' | 'prot'>[]
  /** Proteína objetivo (g) de cada fecha con registro: el objetivo congelado de ese día. */
  protObjetivo: ReadonlyMap<string, number>
  /** Cheat days: no dan XP de proteína (el registro del día sí cuenta). */
  cheatDays?: ReadonlySet<string>
  planes?: readonly TramoPlanSemanal[]
  pausas?: readonly Pausa[]
  conNutricion: boolean
  /** Caminatas, carreras y senderismo terminados. */
  actividades?: readonly Pick<Actividad, 'id' | 'fecha' | 'distanciaM'>[]
}

/** Entreno terminado con al menos `SERIES_MINIMAS` series efectivas, haya sumado XP o no. */
export interface EntrenoQueCuenta {
  workoutId: number
  fecha: string
  inicio: number
  series: number
}

/** Récord de un entreno terminado frente a los anteriores (todos, sin el tope de XP). */
export interface RecordDeEntreno {
  workoutId: number
  fecha: string
  record: RecordEjercicio
}

export interface SemanaActual extends SemanaRitmo {
  /** Entrenos del plan que ya suman XP esta semana y cuántos pueden sumar (los del plan). */
  entrenosQueSuman: number
  tope: number
  /** Días con actividades que ya suman esta semana (como mucho `XP_ACTIVIDAD.diasPorSemana`). */
  diasActividad: number
}

export interface ResultadoExperiencia {
  /** En orden cronológico. */
  eventos: EventoXp[]
  sinXp: EntrenoSinXp[]
  actividadesSinXp: ActividadSinXp[]
  total: number
  semanaActual: SemanaActual
  /** Ritmo del mismo historial (estado de cada semana, hilo, comodines): la semana cumplida sale de aquí. */
  ritmo: ResultadoRitmo
  /** Días con un entreno que cuenta (`SERIES_MINIMAS`) y días con alguna comida (vacío si la nutrición no cuenta). */
  diasEntreno: ReadonlySet<string>
  diasRegistro: ReadonlySet<string>
  /** En orden cronológico. */
  entrenos: EntrenoQueCuenta[]
  records: RecordDeEntreno[]
}

/** XP de un entreno: completa desde `SERIES_COMPLETAS` series efectivas y proporcional por debajo (3 series, 50 XP). */
export function xpDeEntreno(series: number): number {
  return Math.round((XP.entreno * Math.min(Math.max(0, series), SERIES_COMPLETAS)) / SERIES_COMPLETAS)
}

const ORDEN_TIPO: Record<EventoXp['tipo'], number> = { entreno: 0, record: 1, actividad: 2, registro: 3, proteina: 4, semana: 5 }

function agrupar<T, K>(items: readonly T[], clave: (t: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>()
  for (const it of items) {
    const k = clave(it)
    const lista = m.get(k)
    if (lista) lista.push(it)
    else m.set(k, [it])
  }
  return m
}

/**
 * Toda la XP del historial hasta `hoy`, con su motivo. Entrenos: proporcional a las series efectivas hasta 6, uno por día
 * (el de más series) y, por semana, hasta completar el plan; hasta 3 récords por sesión que suma. Nutrición (si cuenta):
 * un día registrado y la proteína al 90 % de su objetivo (salvo en un cheat day). Constancia: cada semana cumplida según su plan.
 */
export function calcularExperiencia(d: DatosExperiencia): ResultadoExperiencia {
  const terminados = d.workouts
    .filter((w) => w.fin !== undefined)
    .map((w) => ({ ...w, fecha: toISODate(new Date(w.inicio)) }))
    .filter((w) => w.fecha <= d.hoy)
    .sort((a, b) => a.inicio - b.inicio)
  const ids = new Set(terminados.map((w) => w.id))
  const porWorkout = agrupar(d.sets.filter((s) => ids.has(s.workoutId)), (s) => s.workoutId)
  // Series de los entrenos anteriores al que se recorre, agrupadas para comparar récords (la detección de Gym) sin
  // volver a procesar todo el historial en cada entreno. Los de la misma hora de inicio no se comparan entre sí.
  const historial: GruposComparables = new Map()
  let pendientes: typeof terminados = []

  const eventos: EventoXp[] = []
  const sinXp: EntrenoSinXp[] = []
  const diasEntreno = new Set<string>()
  const entrenos: EntrenoQueCuenta[] = []
  const records: RecordDeEntreno[] = []
  const sesiones: { workoutId: number; fecha: string; series: number; records: RecordEjercicio[] }[] = []

  for (const w of terminados) {
    if (pendientes.length && pendientes[0].inicio < w.inicio) {
      for (const p of pendientes) acumularComparables(historial, porWorkout.get(p.id) ?? [])
      pendientes = []
    }
    pendientes.push(w)
    const propias = porWorkout.get(w.id) ?? []
    const delEntreno = recordsFrenteA(propias, historial)
    for (const record of delEntreno) records.push({ workoutId: w.id, fecha: w.fecha, record })
    const series = propias.filter(esEfectiva).length
    sesiones.push({ workoutId: w.id, fecha: w.fecha, series, records: delEntreno })
    if (series >= SERIES_MINIMAS) {
      diasEntreno.add(w.fecha)
      entrenos.push({ workoutId: w.id, fecha: w.fecha, inicio: w.inicio, series })
    }
  }

  // Un entreno por día, el de más series (a igualdad, el primero). Por semana suman hasta completar el plan: los que
  // cuentan para él ocupan un hueco y los cortos suman mientras quede alguno, sin ocuparlo.
  const delPlanPorSemana = new Map<string, number>()
  for (const [fecha, delDia] of agrupar(sesiones, (s) => s.fecha)) {
    const mejor = delDia.reduce((a, s) => (s.series > a.series ? s : a))
    for (const s of delDia) {
      if (s !== mejor) sinXp.push({ workoutId: s.workoutId, fecha, series: s.series, motivo: s.series === 0 ? 'sin-series' : 'otro-hoy' })
    }
    if (mejor.series === 0) {
      sinXp.push({ workoutId: mejor.workoutId, fecha, series: 0, motivo: 'sin-series' })
      continue
    }
    const lunes = startOfWeek(fecha)
    const tope = planDeSemana(d.planes, lunes).entrenos
    const delPlan = delPlanPorSemana.get(lunes) ?? 0
    if (delPlan >= tope) {
      sinXp.push({ workoutId: mejor.workoutId, fecha, series: mejor.series, motivo: 'tope-semana', tope })
      continue
    }
    if (mejor.series >= SERIES_MINIMAS) delPlanPorSemana.set(lunes, delPlan + 1)
    eventos.push({ tipo: 'entreno', fecha, xp: xpDeEntreno(mejor.series), workoutId: mejor.workoutId, series: mejor.series })
    for (const record of mejor.records.slice(0, RECORDS_POR_SESION)) {
      eventos.push({ tipo: 'record', fecha, xp: XP.record, workoutId: mejor.workoutId, record })
    }
  }

  // Actividades: los metros de cada día, en orden; por semana suman los primeros días con al menos 1 km.
  const actividadesSinXp: ActividadSinXp[] = []
  const diasActividadPorSemana = new Map<string, number>()
  const porFecha = [...agrupar((d.actividades ?? []).filter((a) => a.fecha <= d.hoy), (a) => a.fecha)].sort(([a], [b]) => a.localeCompare(b))
  for (const [fecha, delDia] of porFecha) {
    const distanciaM = delDia.reduce((a, x) => a + (Number.isFinite(x.distanciaM) ? x.distanciaM : 0), 0)
    const actividadIds = delDia.map((x) => x.id)
    if (distanciaM < XP_ACTIVIDAD.metrosMinimos) {
      actividadesSinXp.push({ fecha, distanciaM, actividadIds, motivo: 'corta' })
      continue
    }
    const lunes = startOfWeek(fecha)
    const usados = diasActividadPorSemana.get(lunes) ?? 0
    if (usados >= XP_ACTIVIDAD.diasPorSemana) {
      actividadesSinXp.push({ fecha, distanciaM, actividadIds, motivo: 'tope-semana' })
      continue
    }
    diasActividadPorSemana.set(lunes, usados + 1)
    eventos.push({ tipo: 'actividad', fecha, xp: xpDeActividad(distanciaM), distanciaM, actividadIds })
  }

  const diasRegistro = new Set<string>()
  if (d.conNutricion) {
    for (const [fecha, delDia] of agrupar(d.entries.filter((e) => e.fecha <= d.hoy), (e) => e.fecha)) {
      diasRegistro.add(fecha)
      const comidas = new Set(delDia.map((e) => e.comida)).size
      eventos.push({ tipo: 'registro', fecha, xp: comidas >= 2 ? XP.diaRegistrado : XP.diaUnaComida, comidas })
      const prot = delDia.reduce((a, e) => a + (Number.isFinite(e.prot) ? e.prot : 0), 0)
      const objetivo = d.protObjetivo.get(fecha) ?? 0
      if (!d.cheatDays?.has(fecha) && objetivo > 0 && prot >= objetivo * PROPORCION_PROTEINA - 1e-9) {
        eventos.push({ tipo: 'proteina', fecha, xp: XP.proteina, prot, objetivo })
      }
    }
  }

  const ritmo = calcularRitmo({ hoy: d.hoy, diasEntreno, diasRegistro: d.conNutricion ? diasRegistro : null, planes: d.planes, pausas: d.pausas })
  for (const semana of ritmo.semanas) {
    if (semana.cumplidaEl !== null) eventos.push({ tipo: 'semana', fecha: semana.cumplidaEl, xp: XP.semanaCumplida, lunes: semana.lunes, estado: semana })
  }

  eventos.sort((a, b) => a.fecha.localeCompare(b.fecha) || ORDEN_TIPO[a.tipo] - ORDEN_TIPO[b.tipo])

  const lunesActual = startOfWeek(d.hoy)
  const planActual = planDeSemana(d.planes, lunesActual)
  return {
    eventos,
    sinXp,
    actividadesSinXp,
    total: eventos.reduce((a, e) => a + e.xp, 0),
    ritmo,
    entrenos,
    records,
    diasEntreno,
    diasRegistro,
    semanaActual: {
      ...ritmo.actual,
      entrenosQueSuman: delPlanPorSemana.get(lunesActual) ?? 0,
      tope: planActual.entrenos,
      diasActividad: diasActividadPorSemana.get(lunesActual) ?? 0,
    },
  }
}

// ── Lecturas para la interfaz ──

export type EstadoEntrenoHoy =
  | { estado: 'hoy'; series: number }
  | { estado: 'tope'; tope: number }
  | { estado: 'listo'; quedan: number }

/** Lo que valdría entrenar hoy: ya suma un entreno, el plan de la semana está completo o cuántos entrenos del plan quedan. */
export function entrenoHoy(r: ResultadoExperiencia, hoy: string): EstadoEntrenoHoy {
  const deHoy = r.eventos.find((e) => e.tipo === 'entreno' && e.fecha === hoy)
  if (deHoy?.tipo === 'entreno') return { estado: 'hoy', series: deHoy.series }
  const { entrenosQueSuman, tope } = r.semanaActual
  if (entrenosQueSuman >= tope) return { estado: 'tope', tope }
  return { estado: 'listo', quedan: tope - entrenosQueSuman }
}

export function textoEntrenoHoy(d: EstadoEntrenoHoy): string {
  if (d.estado === 'hoy') {
    return d.series >= SERIES_COMPLETAS ? 'Hoy ya suma un entreno' : `Hoy suma un entreno de ${seriesTexto(d.series)}: otro con más series lo sustituye`
  }
  if (d.estado === 'tope') return `Plan de la semana completo: ya suman sus ${formatInt(d.tope)} entrenos`
  return d.quedan === 1 ? 'Queda 1 entreno del plan esta semana' : `Quedan ${formatInt(d.quedan)} entrenos del plan esta semana`
}

const seriesTexto = (n: number) => (n === 1 ? '1 serie efectiva' : `${formatInt(n)} series efectivas`)

/** Título y detalle de cada XP, para explicarla. `nombres`: nombre de cada ejercicio por id. */
export function describirEvento(e: EventoXp, nombres: Readonly<Record<number, string>>): { titulo: string; detalle: string } {
  switch (e.tipo) {
    case 'entreno': {
      if (e.series >= SERIES_COMPLETAS) return { titulo: 'Entreno', detalle: seriesTexto(e.series) }
      const parte = `${formatInt(e.series)} de ${formatInt(SERIES_COMPLETAS)} series efectivas`
      return { titulo: 'Entreno', detalle: e.series >= SERIES_MINIMAS ? parte : `${parte} · no cuenta para el plan` }
    }
    case 'record':
      return { titulo: `Récord · ${nombres[e.record.exerciseId] ?? 'Ejercicio'}`, detalle: describirRecord(e.record, (n) => formatNumber(n, 2)) }
    case 'actividad': {
      const tope = e.xp >= XP_ACTIVIDAD.maxDia ? ` (tope de ${formatInt(XP_ACTIVIDAD.maxDia)} m al día)` : ''
      return { titulo: e.actividadIds.length === 1 ? 'Actividad' : `${formatInt(e.actividadIds.length)} actividades`, detalle: `${kmTexto(e.distanciaM)} · ${formatInt(XP_ACTIVIDAD.porKm)} m por km${tope}` }
    }
    case 'registro':
      return { titulo: 'Día registrado', detalle: e.comidas >= 2 ? `${formatInt(e.comidas)} comidas` : `1 comida (con 2 o más, ${formatInt(XP.diaRegistrado)} m)` }
    case 'proteina':
      return { titulo: 'Proteína', detalle: `${formatInt(e.prot)} de ${formatInt(e.objetivo)} g (90 % o más)` }
    case 'semana': {
      const { estado } = e
      const dias = estado.diasRegistrados === null ? '' : `${formatInt(estado.diasRegistrados)} de ${formatInt(estado.plan.diasRegistro)} días registrados`
      if (estado.pausa?.tipo === 'entreno' && estado.diasRegistrados !== null) return { titulo: 'Semana cumplida', detalle: `${dias} · en pausa de entreno` }
      return { titulo: 'Semana cumplida', detalle: `${formatInt(estado.entrenos)} de ${formatInt(estado.plan.entrenos)} entrenos${dias ? ` · ${dias}` : ''}` }
    }
  }
}

/** Por qué un entreno no suma, en una frase. Con `hoy`, habla de hoy y de esta semana si el entreno es de ellas. */
export function describirSinXp(s: EntrenoSinXp, hoy?: string): string {
  if (s.motivo === 'sin-series') return 'Sin series efectivas'
  if (s.motivo === 'otro-hoy') return s.fecha === hoy ? 'Hoy suma otro entreno, el de más series' : 'Ese día sumaba otro entreno, el de más series'
  const tope = `los ${formatInt(s.tope ?? 0)} entrenos de tu plan`
  return hoy !== undefined && startOfWeek(s.fecha) === startOfWeek(hoy) ? `Esta semana ya suman ${tope}` : `Esa semana ya sumaban ${tope}`
}

/** Por qué un día con actividades no suma, en una frase. */
export function describirActividadSinXp(s: ActividadSinXp, hoy?: string): string {
  if (s.motivo === 'corta') return `${kmTexto(s.distanciaM)}: cuenta desde ${kmTexto(XP_ACTIVIDAD.metrosMinimos)} al día`
  const dias = `sus ${formatInt(XP_ACTIVIDAD.diasPorSemana)} días con actividad`
  return hoy !== undefined && startOfWeek(s.fecha) === startOfWeek(hoy) ? `Esta semana ya suman ${dias}` : `Esa semana ya sumaban ${dias}`
}

export interface DiaXp {
  fecha: string
  total: number
  eventos: EventoXp[]
  sinXp: EntrenoSinXp[]
  actividadesSinXp: ActividadSinXp[]
}

/** XP agrupada por día, del más reciente al más antiguo; incluye los días con un entreno que no sumó. */
export function xpPorDia(r: Pick<ResultadoExperiencia, 'eventos' | 'sinXp'> & Partial<Pick<ResultadoExperiencia, 'actividadesSinXp'>>): DiaXp[] {
  const dias = new Map<string, DiaXp>()
  const dia = (fecha: string) => {
    let d = dias.get(fecha)
    if (!d) dias.set(fecha, (d = { fecha, total: 0, eventos: [], sinXp: [], actividadesSinXp: [] }))
    return d
  }
  for (const e of r.eventos) { const d = dia(e.fecha); d.eventos.push(e); d.total += e.xp }
  for (const s of r.sinXp) dia(s.fecha).sinXp.push(s)
  for (const s of r.actividadesSinXp ?? []) dia(s.fecha).actividadesSinXp.push(s)
  return [...dias.values()].sort((a, b) => b.fecha.localeCompare(a.fecha))
}

/** XP ganada entre dos fechas, ambas incluidas. */
export function xpEntre(eventos: readonly EventoXp[], desde: string, hasta: string): number {
  return eventos.reduce((a, e) => (e.fecha >= desde && e.fecha <= hasta ? a + e.xp : a), 0)
}

export interface XpSesion {
  eventos: EventoXp[]
  total: number
  sinXp: EntrenoSinXp | null
}

export interface XpActividad {
  /** XP del día de la actividad (la suman todas las de ese día juntas). */
  evento: Extract<EventoXp, { tipo: 'actividad' }> | null
  sinXp: ActividadSinXp | null
}

/** XP del día de una actividad concreta o por qué no suma. */
export function xpDeActividadId(r: Pick<ResultadoExperiencia, 'eventos' | 'actividadesSinXp'>, actividadId: number): XpActividad {
  const evento = r.eventos.find((e): e is Extract<EventoXp, { tipo: 'actividad' }> => e.tipo === 'actividad' && e.actividadIds.includes(actividadId)) ?? null
  return { evento, sinXp: r.actividadesSinXp.find((s) => s.actividadIds.includes(actividadId)) ?? null }
}

/** XP de un entreno concreto (entreno y récords) o por qué no suma. */
export function xpDeSesion(r: ResultadoExperiencia, workoutId: number): XpSesion {
  const eventos = r.eventos.filter((e) => (e.tipo === 'entreno' || e.tipo === 'record') && e.workoutId === workoutId)
  return { eventos, total: eventos.reduce((a, e) => a + e.xp, 0), sinXp: r.sinXp.find((s) => s.workoutId === workoutId) ?? null }
}
