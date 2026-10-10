// Atributos: nivel y experiencia (XP) derivados del historial (gaming.md, ADR 029). Funciones puras: la XP no se
// acumula ni se guarda, se recalcula a partir de los registros. Así respeta la edición retroactiva, va en el backup sin
// cambios de esquema y borrar y volver a crear no da nada.
import type { Entry, Pausa, SetEntry, TramoPlanSemanal, Workout } from '../../../shared/db/types'
import { startOfWeek, toISODate } from '../../../shared/lib/dates'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { acumularComparables, describirRecord, recordsFrenteA, type GruposComparables, type RecordEjercicio } from '../../gym/lib/records'
import { esEfectiva } from '../../gym/lib/workout'
import { planDeSemana } from '../../ritmo/lib/plan'
import { calcularRitmo, type ResultadoRitmo, type SemanaRitmo } from '../../ritmo/lib/ritmo'

/** Versión de las reglas. Si cambian, las semanas ya cerradas deben conservar la XP de la versión con la que se ganaron. */
export const VERSION_REGLAS = 1

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

export type Atributo = 'fuerza' | 'nutricion' | 'constancia'

export const ATRIBUTOS: Record<Atributo, { nombre: string; fuente: string }> = {
  fuerza: { nombre: 'Fuerza', fuente: 'Entrenos y récords' },
  nutricion: { nombre: 'Nutrición', fuente: 'Registro de comidas y proteína' },
  constancia: { nombre: 'Constancia', fuente: 'Semanas cumplidas' },
}

interface BaseEvento {
  fecha: string
  xp: number
}

export type EventoXp =
  | BaseEvento & { tipo: 'entreno'; atributo: 'fuerza'; workoutId: number; series: number }
  | BaseEvento & { tipo: 'record'; atributo: 'fuerza'; workoutId: number; record: RecordEjercicio }
  | BaseEvento & { tipo: 'registro'; atributo: 'nutricion'; comidas: number }
  | BaseEvento & { tipo: 'proteina'; atributo: 'nutricion'; prot: number; objetivo: number }
  | BaseEvento & { tipo: 'semana'; atributo: 'constancia'; lunes: string; estado: SemanaRitmo }

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

export interface DatosAtributos {
  hoy: string
  /** Entrenos terminados (los que no tienen `fin` se ignoran). */
  workouts: Pick<Workout, 'id' | 'inicio' | 'fin'>[]
  sets: SetEntry[]
  entries: Pick<Entry, 'fecha' | 'comida' | 'prot'>[]
  /** Proteína objetivo (g) de cada fecha con registro: el objetivo congelado de ese día. */
  protObjetivo: ReadonlyMap<string, number>
  planes?: readonly TramoPlanSemanal[]
  pausas?: readonly Pausa[]
  conNutricion: boolean
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
}

export interface ResultadoAtributos {
  /** En orden cronológico. */
  eventos: EventoXp[]
  sinXp: EntrenoSinXp[]
  total: number
  porAtributo: Record<Atributo, number>
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

const ORDEN_TIPO: Record<EventoXp['tipo'], number> = { entreno: 0, record: 1, registro: 2, proteina: 3, semana: 4 }

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
 * un día registrado y la proteína al 90 % de su objetivo. Constancia: cada semana cumplida según su plan.
 */
export function calcularAtributos(d: DatosAtributos): ResultadoAtributos {
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
    eventos.push({ tipo: 'entreno', atributo: 'fuerza', fecha, xp: xpDeEntreno(mejor.series), workoutId: mejor.workoutId, series: mejor.series })
    for (const record of mejor.records.slice(0, RECORDS_POR_SESION)) {
      eventos.push({ tipo: 'record', atributo: 'fuerza', fecha, xp: XP.record, workoutId: mejor.workoutId, record })
    }
  }

  const diasRegistro = new Set<string>()
  if (d.conNutricion) {
    for (const [fecha, delDia] of agrupar(d.entries.filter((e) => e.fecha <= d.hoy), (e) => e.fecha)) {
      diasRegistro.add(fecha)
      const comidas = new Set(delDia.map((e) => e.comida)).size
      eventos.push({ tipo: 'registro', atributo: 'nutricion', fecha, xp: comidas >= 2 ? XP.diaRegistrado : XP.diaUnaComida, comidas })
      const prot = delDia.reduce((a, e) => a + (Number.isFinite(e.prot) ? e.prot : 0), 0)
      const objetivo = d.protObjetivo.get(fecha) ?? 0
      if (objetivo > 0 && prot >= objetivo * PROPORCION_PROTEINA - 1e-9) {
        eventos.push({ tipo: 'proteina', atributo: 'nutricion', fecha, xp: XP.proteina, prot, objetivo })
      }
    }
  }

  const ritmo = calcularRitmo({ hoy: d.hoy, diasEntreno, diasRegistro: d.conNutricion ? diasRegistro : null, planes: d.planes, pausas: d.pausas })
  for (const semana of ritmo.semanas) {
    if (semana.cumplidaEl !== null) eventos.push({ tipo: 'semana', atributo: 'constancia', fecha: semana.cumplidaEl, xp: XP.semanaCumplida, lunes: semana.lunes, estado: semana })
  }

  eventos.sort((a, b) => a.fecha.localeCompare(b.fecha) || ORDEN_TIPO[a.tipo] - ORDEN_TIPO[b.tipo])
  const porAtributo: Record<Atributo, number> = { fuerza: 0, nutricion: 0, constancia: 0 }
  for (const e of eventos) porAtributo[e.atributo] += e.xp

  const lunesActual = startOfWeek(d.hoy)
  const planActual = planDeSemana(d.planes, lunesActual)
  return {
    eventos,
    sinXp,
    total: porAtributo.fuerza + porAtributo.nutricion + porAtributo.constancia,
    porAtributo,
    ritmo,
    entrenos,
    records,
    diasEntreno,
    diasRegistro,
    semanaActual: {
      ...ritmo.actual,
      entrenosQueSuman: delPlanPorSemana.get(lunesActual) ?? 0,
      tope: planActual.entrenos,
    },
  }
}

// ── Nivel y títulos ──

/** XP para pasar del nivel `n` al `n + 1`: 500 el primero y un 6 % más cada nivel (845 en el 10, 2.709 en el 30). */
export function costeNivel(n: number): number {
  return Math.round(500 * 1.06 ** (n - 1))
}

export interface Nivel {
  nivel: number
  /** XP dentro del nivel actual y lo que cuesta llegar al siguiente. */
  xpEnNivel: number
  xpSiguiente: number
}

/** Nivel que corresponde a una XP total. Empieza en 1 y nunca depende de la inactividad. */
export function nivelDeXp(total: number): Nivel {
  let nivel = 1
  let resto = Number.isFinite(total) ? Math.max(0, total) : 0
  while (resto >= costeNivel(nivel)) {
    resto -= costeNivel(nivel)
    nivel += 1
  }
  return { nivel, xpEnNivel: resto, xpSiguiente: costeNivel(nivel) }
}

/** Un título cada 5 niveles. */
export const TITULOS: readonly { desde: number; titulo: string }[] = [
  { desde: 1, titulo: 'Recién llegado' },
  { desde: 5, titulo: 'Novato' },
  { desde: 10, titulo: 'Habitual' },
  { desde: 15, titulo: 'Constante' },
  { desde: 20, titulo: 'Sólido' },
  { desde: 25, titulo: 'Curtido' },
  { desde: 30, titulo: 'Veterano' },
  { desde: 35, titulo: 'Experto' },
  { desde: 40, titulo: 'Maestro' },
  { desde: 45, titulo: 'Referente' },
  { desde: 50, titulo: 'Leyenda' },
]

export function tituloDe(nivel: number): string {
  let titulo = TITULOS[0].titulo
  for (const t of TITULOS) if (nivel >= t.desde) titulo = t.titulo
  return titulo
}

// ── Lecturas para la interfaz ──

export type EstadoEntrenoHoy =
  | { estado: 'hoy'; series: number }
  | { estado: 'tope'; tope: number }
  | { estado: 'listo'; quedan: number }

/** Lo que valdría entrenar hoy: ya suma un entreno, el plan de la semana está completo o cuántos entrenos del plan quedan. */
export function entrenoHoy(r: ResultadoAtributos, hoy: string): EstadoEntrenoHoy {
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
    case 'registro':
      return { titulo: 'Día registrado', detalle: e.comidas >= 2 ? `${formatInt(e.comidas)} comidas` : `1 comida (con 2 o más, ${formatInt(XP.diaRegistrado)} XP)` }
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

export interface DiaXp {
  fecha: string
  total: number
  eventos: EventoXp[]
  sinXp: EntrenoSinXp[]
}

/** XP agrupada por día, del más reciente al más antiguo; incluye los días con un entreno que no sumó. */
export function xpPorDia(r: Pick<ResultadoAtributos, 'eventos' | 'sinXp'>): DiaXp[] {
  const dias = new Map<string, DiaXp>()
  const dia = (fecha: string) => {
    let d = dias.get(fecha)
    if (!d) dias.set(fecha, (d = { fecha, total: 0, eventos: [], sinXp: [] }))
    return d
  }
  for (const e of r.eventos) { const d = dia(e.fecha); d.eventos.push(e); d.total += e.xp }
  for (const s of r.sinXp) dia(s.fecha).sinXp.push(s)
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
  antes: Nivel
  despues: Nivel
}

/** XP de un entreno concreto (entreno y récords) y el nivel antes y después de sumarla. */
export function xpDeSesion(r: ResultadoAtributos, workoutId: number): XpSesion {
  const eventos = r.eventos.filter((e) => (e.tipo === 'entreno' || e.tipo === 'record') && e.workoutId === workoutId)
  const total = eventos.reduce((a, e) => a + e.xp, 0)
  return { eventos, total, sinXp: r.sinXp.find((s) => s.workoutId === workoutId) ?? null, antes: nivelDeXp(r.total - total), despues: nivelDeXp(r.total) }
}
