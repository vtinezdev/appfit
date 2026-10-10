// Atributos: nivel y experiencia (XP) derivados del historial (gaming.md, ADR 029). Funciones puras: la XP no se
// acumula ni se guarda, se recalcula a partir de los registros. Así respeta la edición retroactiva, va en el backup sin
// cambios de esquema y borrar y volver a crear no da nada.
import type { Entry, Pausa, SetEntry, TramoPlanSemanal, Workout } from '../../../shared/db/types'
import { diasEntre, startOfWeek, toISODate } from '../../../shared/lib/dates'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { acumularComparables, describirRecord, recordsFrenteA, type GruposComparables, type RecordEjercicio } from '../../gym/lib/records'
import { esEfectiva } from '../../gym/lib/workout'
import { planDeSemana } from '../../ritmo/lib/plan'
import { calcularRitmo, type ResultadoRitmo, type SemanaRitmo } from '../../ritmo/lib/ritmo'

/** Versión de las reglas. Si cambian, las semanas ya cerradas deben conservar la XP de la versión con la que se ganaron. */
export const VERSION_REGLAS = 1

export const XP = { entreno: 100, diaRegistrado: 30, diaUnaComida: 10, proteina: 20, semanaCumplida: 150, record: 25 } as const
/** Un entreno cuenta con al menos estas series efectivas (sin calentamiento ni series marcadas como no hechas). */
export const SERIES_MINIMAS = 6
export const RECORDS_POR_SESION = 3
/** Proteína del día frente a su objetivo: llegar al 90 % basta (no premia comer menos). */
export const PROPORCION_PROTEINA = 0.9
/** Entrenos por semana que suman XP: los del plan y uno más. */
export const ENTRENOS_EXTRA = 1

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
  | BaseEvento & { tipo: 'entreno'; atributo: 'fuerza'; workoutId: number; series: number; diasDescanso: number | null; multiplicador: number }
  | BaseEvento & { tipo: 'record'; atributo: 'fuerza'; workoutId: number; record: RecordEjercicio }
  | BaseEvento & { tipo: 'registro'; atributo: 'nutricion'; comidas: number }
  | BaseEvento & { tipo: 'proteina'; atributo: 'nutricion'; prot: number; objetivo: number }
  | BaseEvento & { tipo: 'semana'; atributo: 'constancia'; lunes: string; estado: SemanaRitmo }

/** Por qué un entreno terminado no suma XP. */
export type MotivoSinXp = 'pocas-series' | 'otro-hoy' | 'tope-semana'

export interface EntrenoSinXp {
  workoutId: number
  fecha: string
  series: number
  motivo: MotivoSinXp
  /** En `tope-semana`, cuántos entrenos suman esa semana. */
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

/** Entreno terminado con al menos 6 series efectivas, haya sumado XP o no. */
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
  /** Entrenos que ya suman XP esta semana y cuántos pueden sumar (plan + 1). */
  entrenosQueSuman: number
  tope: number
}

export interface ResultadoAtributos {
  /** En orden cronológico. */
  eventos: EventoXp[]
  sinXp: EntrenoSinXp[]
  total: number
  porAtributo: Record<Atributo, number>
  /** Último día (≤ hoy) con un entreno de al menos 6 series efectivas. */
  ultimoEntreno: string | null
  semanaActual: SemanaActual
  /** Ritmo del mismo historial (estado de cada semana, hilo, comodines): la semana cumplida sale de aquí. */
  ritmo: ResultadoRitmo
  /** Días con un entreno de al menos 6 series efectivas y días con alguna comida (vacío si la nutrición no cuenta). */
  diasEntreno: ReadonlySet<string>
  diasRegistro: ReadonlySet<string>
  /** En orden cronológico. */
  entrenos: EntrenoQueCuenta[]
  records: RecordDeEntreno[]
}

/** ×1 sin descanso (o sin entreno anterior), ×1,5 con un día sin entrenar antes y ×2 con dos o más. */
export function multiplicadorDescanso(diasDescanso: number | null): number {
  if (diasDescanso === null || diasDescanso <= 0) return 1
  return diasDescanso === 1 ? 1.5 : 2
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
 * Toda la XP del historial hasta `hoy`, con su motivo. Entrenos: ≥ 6 series efectivas, uno por día y como mucho plan + 1
 * por semana, por el descanso acumulado; hasta 3 récords por sesión que cuenta. Nutrición (si cuenta): un día registrado
 * y la proteína al 90 % de su objetivo. Constancia: cada semana cumplida según su plan.
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
  const diasConXp = new Set<string>()
  const sumanPorSemana = new Map<string, number>()
  let ultimoEntreno: string | null = null
  const entrenos: EntrenoQueCuenta[] = []
  const records: RecordDeEntreno[] = []

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
    if (series < SERIES_MINIMAS) {
      sinXp.push({ workoutId: w.id, fecha: w.fecha, series, motivo: 'pocas-series' })
      continue
    }
    const anterior = ultimoEntreno !== null && ultimoEntreno < w.fecha ? ultimoEntreno : null
    ultimoEntreno = w.fecha
    diasEntreno.add(w.fecha)
    entrenos.push({ workoutId: w.id, fecha: w.fecha, inicio: w.inicio, series })
    if (diasConXp.has(w.fecha)) {
      sinXp.push({ workoutId: w.id, fecha: w.fecha, series, motivo: 'otro-hoy' })
      continue
    }
    const lunes = startOfWeek(w.fecha)
    const tope = planDeSemana(d.planes, lunes).entrenos + ENTRENOS_EXTRA
    const suman = sumanPorSemana.get(lunes) ?? 0
    if (suman >= tope) {
      sinXp.push({ workoutId: w.id, fecha: w.fecha, series, motivo: 'tope-semana', tope })
      continue
    }
    sumanPorSemana.set(lunes, suman + 1)
    diasConXp.add(w.fecha)
    // El descanso cuenta los días sin entrenar desde el último entreno que cuenta como tal, haya sumado XP o no.
    const diasDescanso = anterior === null ? null : diasEntre(anterior, w.fecha) - 1
    const multiplicador = multiplicadorDescanso(diasDescanso)
    eventos.push({ tipo: 'entreno', atributo: 'fuerza', fecha: w.fecha, xp: Math.round(XP.entreno * multiplicador), workoutId: w.id, series, diasDescanso, multiplicador })
    for (const record of delEntreno.slice(0, RECORDS_POR_SESION)) {
      eventos.push({ tipo: 'record', atributo: 'fuerza', fecha: w.fecha, xp: XP.record, workoutId: w.id, record })
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
    ultimoEntreno,
    ritmo,
    entrenos,
    records,
    diasEntreno,
    diasRegistro,
    semanaActual: {
      ...ritmo.actual,
      entrenosQueSuman: sumanPorSemana.get(lunesActual) ?? 0,
      tope: planActual.entrenos + ENTRENOS_EXTRA,
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

export type EstadoDescanso =
  | { estado: 'hoy' }
  | { estado: 'tope'; tope: number }
  | { estado: 'listo'; diasDescanso: number | null; multiplicador: number }

/** Lo que valdría entrenar hoy: ya cuenta un entreno, la semana está al tope o el multiplicador por descanso. */
export function descansoActual(r: ResultadoAtributos, hoy: string): EstadoDescanso {
  if (r.eventos.some((e) => e.tipo === 'entreno' && e.fecha === hoy)) return { estado: 'hoy' }
  if (r.semanaActual.entrenosQueSuman >= r.semanaActual.tope) return { estado: 'tope', tope: r.semanaActual.tope }
  const diasDescanso = r.ultimoEntreno === null ? null : Math.max(0, diasEntre(r.ultimoEntreno, hoy) - 1)
  return { estado: 'listo', diasDescanso, multiplicador: multiplicadorDescanso(diasDescanso) }
}

export function formatMultiplicador(m: number): string {
  return `×${formatNumber(m, 1)}`
}

export function textoDescanso(d: EstadoDescanso): string {
  if (d.estado === 'hoy') return 'Hoy ya suma un entreno'
  if (d.estado === 'tope') return `Esta semana ya suman ${formatInt(d.tope)} entrenos`
  if (d.diasDescanso === null) return 'Tu primer entreno sumará XP'
  if (d.multiplicador === 1) return 'Sin descanso acumulado: el próximo entreno vale ×1'
  return `${diasTexto(d.diasDescanso)} de descanso: el próximo entreno vale ${formatMultiplicador(d.multiplicador)}`
}

const diasTexto = (n: number) => (n === 1 ? '1 día' : `${formatInt(n)} días`)

/** Título y detalle de cada XP, para explicarla. `nombres`: nombre de cada ejercicio por id. */
export function describirEvento(e: EventoXp, nombres: Readonly<Record<number, string>>): { titulo: string; detalle: string } {
  switch (e.tipo) {
    case 'entreno': {
      const series = `${formatInt(e.series)} series efectivas`
      if (e.diasDescanso === null) return { titulo: 'Entreno', detalle: `${series} · primer entreno` }
      if (e.multiplicador === 1) return { titulo: 'Entreno', detalle: `${series} · sin día de descanso antes` }
      return { titulo: 'Entreno', detalle: `${series} · ${diasTexto(e.diasDescanso)} de descanso: ${formatMultiplicador(e.multiplicador)}` }
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
  if (s.motivo === 'pocas-series') return `${formatInt(s.series)} ${s.series === 1 ? 'serie efectiva' : 'series efectivas'}: suma a partir de ${formatInt(SERIES_MINIMAS)}`
  if (s.motivo === 'otro-hoy') return s.fecha === hoy ? 'Hoy ya suma otro entreno' : 'Ese día ya sumaba otro entreno'
  const tope = `${formatInt(s.tope ?? 0)} entrenos (tu plan y uno más)`
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
