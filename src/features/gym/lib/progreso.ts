import { claveComparacion, repsComparables, pesoComparable } from './ejecucion'
import type { ModoCarga, SetEntry, Workout } from '../../../shared/db/types'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { formatDiaMes } from '../../../shared/lib/dates'
import { modoCarga } from './carga'
import { efectivas, epley1RM, volumenSets } from './workout'
import { acumularComparables, claveGrupo } from './records'
import type { SerieEjecucion } from './ejecucion'

export interface MejorSerie { peso: number; reps: number }

/** Más carga y, a igual carga, más reps; con asistencia, menos ayuda; con peso corporal, más reps. */
function mejorQue(a: MejorSerie, b: MejorSerie, modo: ModoCarga): boolean {
  if (modo === 'corporal') return a.reps > b.reps
  if (a.peso !== b.peso) return modo === 'asistencia' ? a.peso < b.peso : a.peso > b.peso
  return a.reps > b.reps
}
function mejorDe<T extends MejorSerie>(series: T[], modo: ModoCarga): T {
  return series.reduce((m, s) => (mejorQue(s, m, modo) ? s : m))
}

/** Variante de una serie para Progreso: ejecución, agarre y técnica, sin el gimnasio (que es otra dimensión de la gráfica). */
export function claveVariante(s: Parameters<typeof claveComparacion>[0]): string {
  return claveComparacion({ ...s, gimnasioId: undefined })
}

/** Gimnasio de una sesión: el del entreno o, en datos sin él, el snapshot de sus series. `undefined` = habitual. */
const gimnasioDe = (w: Pick<Workout, 'gimnasioId'>, ss: SetEntry[]) => w.gimnasioId ?? ss.find(s => s.gimnasioId !== undefined)?.gimnasioId

/** Filtro de gimnasio de Progreso: sin él, todos; `{ gimnasioId: undefined }`, solo el habitual. */
export type FiltroGimnasioProgreso = { gimnasioId?: number }

/**
 * Solo sesiones terminadas y series del mismo modo y variante; asistencia no invierte la progresión. Cada sesión dice su
 * gimnasio (`gimnasioId`, ausente en el habitual) y `gimnasio` filtra uno (ADR 054).
 */
export function datosProgreso(series: SetEntry[], workouts: Pick<Workout, 'id' | 'inicio' | 'fin' | 'gimnasioId'>[], modo: ModoCarga, variante?: string, gimnasio?: FiltroGimnasioProgreso) {
  const sesiones = new Map(workouts.filter(w => w.fin !== undefined).map(w => [w.id, w]))
  const grupos = new Map<number, SetEntry[]>()
  for (const s of efectivas(series).filter(s => repsComparables(s) > 0 && !s.bajadas?.length && modoCarga(s) === modo && claveVariante(s) === (variante ?? claveComparacion({ modoCarga: modo })))) {
    if (!sesiones.has(s.workoutId)) continue
    grupos.set(s.workoutId, [...(grupos.get(s.workoutId) ?? []), s])
  }
  return [...grupos].filter(([workoutId, ss]) => !gimnasio || gimnasioDe(sesiones.get(workoutId)!, ss) === gimnasio.gimnasioId).map(([workoutId, ss]) => ({
    workoutId, inicio: sesiones.get(workoutId)!.inicio,
    ...(gimnasioDe(sesiones.get(workoutId)!, ss) !== undefined ? { gimnasioId: gimnasioDe(sesiones.get(workoutId)!, ss) } : {}),
    pesoMax: Math.max(...ss.map(pesoComparable)),
    oneRM: modo === 'externa' && !ss[0].ejecucion && !ss[0].excentricaSeg && !ss[0].soloNegativas ? Math.max(...ss.map(s => epley1RM(s.peso, s.reps))) : null,
    asistencia: modo === 'asistencia' ? Math.min(...ss.map(pesoComparable)) : null,
    reps: Math.max(...ss.map(repsComparables)), volumen: volumenSets(ss),
    mejor: mejorDe(ss.map(s => ({ peso: pesoComparable(s), reps: repsComparables(s) })), modo),
  })).sort((a, b) => a.inicio - b.inicio || a.workoutId - b.workoutId)
}
export type SesionProgreso = ReturnType<typeof datosProgreso>[number]
export type MetricaProgreso = 'pesoMax' | 'oneRM' | 'volumen' | 'reps' | 'asistencia'

/** Como mucho tantas líneas en «Todos»: más colores ya no se distinguen (el resto se ve eligiendo su gimnasio). */
export const MAX_LINEAS_GIMNASIO = 4

/**
 * Gimnasios con sesiones, en orden fijo: el habitual primero y después por id. El orden decide el color de cada línea,
 * así que un gimnasio conserva el suyo aunque se filtre otro.
 */
export function gimnasiosConSesiones(datos: readonly Pick<SesionProgreso, 'gimnasioId'>[]): (number | undefined)[] {
  const ids = new Set(datos.map(d => d.gimnasioId))
  // `sort` deja siempre los `undefined` al final: el habitual se pone delante a mano.
  return [...(ids.has(undefined) ? [undefined] : []), ...[...ids].filter((id): id is number => id !== undefined).sort((x, y) => x - y)]
}

/**
 * Filas para la gráfica de «Todos»: una por sesión, con el valor de la métrica solo en la columna de su gimnasio
 * (`g0`, `g1`…, en el orden de `gimnasios`). Las líneas unen las sesiones de cada gimnasio saltando las de los demás.
 */
export function filasPorGimnasio<T extends Pick<SesionProgreso, 'gimnasioId' | MetricaProgreso>>(datos: readonly T[], metrica: MetricaProgreso, gimnasios: readonly (number | undefined)[]): (T & Record<string, unknown>)[] {
  return datos.map(d => {
    const i = gimnasios.indexOf(d.gimnasioId)
    return i < 0 ? { ...d } : { ...d, [`g${i}`]: d[metrica] ?? 0 }
  })
}

/** «100 kg × 5», «+10 kg × 6» (lastre), «−20 kg × 8» (ayuda) o «12 reps» (corporal). */
export function textoMejorSerie(m: MejorSerie, modo: ModoCarga): string {
  const kg = `${formatNumber(m.peso, 2)} kg`
  if (modo === 'corporal') return `${formatInt(m.reps)} reps`
  return `${modo === 'lastre' ? '+' : modo === 'asistencia' ? '−' : ''}${kg} × ${formatInt(m.reps)}`
}

/** Tres cifras clave del periodo mostrado: mejor serie (y cuándo), 1RM estimado máximo y cambio de la métrica entre la primera y la última sesión. */
export function cifrasClave(datos: SesionProgreso[], metrica: MetricaProgreso, modo: ModoCarga) {
  if (!datos.length) return null
  const mejor = mejorDe(datos.map(d => ({ ...d.mejor, inicio: d.inicio })), modo)
  const rms = datos.map(d => d.oneRM).filter((v): v is number => v !== null)
  const valor = (d: SesionProgreso) => d[metrica] ?? 0
  return {
    mejor,
    oneRM: rms.length ? Math.max(...rms) : null,
    cambio: datos.length >= 2 ? valor(datos[datos.length - 1]) - valor(datos[0]) : null,
  }
}

export interface ResumenEjercicioProgreso {
  exerciseId: number
  modo: ModoCarga
  metrica: MetricaProgreso
  /** Última sesión terminada (su mejor serie y su fecha). */
  ultima: SesionProgreso
  /** Valores de la métrica en las últimas sesiones, de la más antigua a la más reciente (para la minigráfica). */
  puntos: number[]
  sesiones: number
}

/** Métrica por defecto de un modo, la misma que abre la gráfica: 1RM si se puede estimar, si no carga, ayuda o reps. */
function metricaPorDefecto(modo: ModoCarga, datos: SesionProgreso[]): MetricaProgreso {
  if (modo === 'externa') return datos.some(d => d.oneRM !== null) ? 'oneRM' : 'pesoMax'
  return modo === 'lastre' ? 'pesoMax' : modo === 'asistencia' ? 'asistencia' : 'reps'
}

/**
 * Lista de Progreso antes de elegir ejercicio: cada ejercicio con sesiones terminadas, con el mismo modo y variante que
 * abriría su gráfica (los primeros registrados), su última mejor serie y los últimos `n` valores. Más reciente primero.
 */
export function resumenEjercicios(series: SetEntry[], workouts: Pick<Workout, 'id' | 'inicio' | 'fin' | 'gimnasioId'>[], n = 8): ResumenEjercicioProgreso[] {
  const porEjercicio = new Map<number, SetEntry[]>()
  for (const s of series) porEjercicio.set(s.exerciseId, [...(porEjercicio.get(s.exerciseId) ?? []), s])
  const out: ResumenEjercicioProgreso[] = []
  for (const [exerciseId, ss] of porEjercicio) {
    const modo = modoCarga(ss[0])
    const variante = ss.filter(s => modoCarga(s) === modo && !s.bajadas?.length).map(claveVariante)[0]
    // Una sola línea: la del habitual si hay sesiones allí; si no, la del primer gimnasio (las máquinas no se mezclan).
    const todas = datosProgreso(ss, workouts, modo, variante)
    const datos = todas.filter(d => d.gimnasioId === gimnasiosConSesiones(todas)[0])
    if (!datos.length) continue
    const metrica = metricaPorDefecto(modo, datos)
    out.push({ exerciseId, modo, metrica, ultima: datos[datos.length - 1], puntos: datos.slice(-n).map(d => d[metrica] ?? 0), sesiones: datos.length })
  }
  return out.sort((a, b) => b.ultima.inicio - a.ultima.inicio || a.exerciseId - b.exerciseId)
}

export interface ResumenVariante {
  /** Clave de la variante (`claveVariante`): la que filtra `datosProgreso`. */
  clave: string
  /** Una serie de la variante, para nombrarla (`contextoSerie`) y saber si admite 1RM. */
  serie: SetEntry
  sesiones: number
  gimnasios: number
  /** Métrica de su tarjeta: la que abriría su gráfica. */
  metrica: MetricaProgreso
  /** La mejor marca de esa métrica en todas sus sesiones (con asistencia, la menor ayuda). */
  mejor: number
  /** Últimos `n` valores de su línea principal (el habitual o, si no hay, el primer gimnasio), para la minigráfica. */
  puntos: number[]
  /** Cambio de la línea principal entre su primera y su última sesión; null con una sola. */
  cambio: number | null
  /** Primera sesión de la línea principal (desde cuándo se mide el cambio). */
  desde: number
  ultima: number
}

/**
 * Tarjetas de variante de Progreso: cada variante del modo con sesiones terminadas, de la que más sesiones tiene a la que
 * menos (a igualdad, la más reciente primero). La tendencia usa una sola línea para no mezclar máquinas de gimnasios distintos.
 */
export function resumenVariantes(series: SetEntry[], workouts: Pick<Workout, 'id' | 'inicio' | 'fin' | 'gimnasioId'>[], modo: ModoCarga, n = 8): ResumenVariante[] {
  const representantes = new Map<string, SetEntry>()
  for (const s of series) if (modoCarga(s) === modo && !s.bajadas?.length && !representantes.has(claveVariante(s))) representantes.set(claveVariante(s), s)
  const out: ResumenVariante[] = []
  for (const [clave, serie] of representantes) {
    const todos = datosProgreso(series, workouts, modo, clave)
    if (!todos.length) continue
    const metrica = metricaPorDefecto(modo, todos)
    const gimnasios = gimnasiosConSesiones(todos)
    const linea = todos.filter(d => d.gimnasioId === gimnasios[0])
    const valores = todos.map(d => d[metrica] ?? 0)
    const deLinea = linea.map(d => d[metrica] ?? 0)
    out.push({ clave, serie, sesiones: todos.length, gimnasios: gimnasios.length, metrica,
      mejor: metrica === 'asistencia' ? Math.min(...valores) : Math.max(...valores),
      puntos: deLinea.slice(-n), cambio: deLinea.length >= 2 ? deLinea[deLinea.length - 1] - deLinea[0] : null,
      desde: linea[0].inicio, ultima: todos[todos.length - 1].inicio })
  }
  return out.sort((a, b) => b.sesiones - a.sesiones || b.ultima - a.ultima)
}

/** Unidad corta de la cifra de cada métrica en su tarjeta. */
export const UNIDAD_TARJETA: Record<MetricaProgreso, string> = { oneRM: 'kg 1RM', pesoMax: 'kg', volumen: 'kg', reps: 'reps', asistencia: 'kg de ayuda' }

/**
 * Texto de la tendencia de una variante («+12 kg desde 3 jun») y si es una mejora: con asistencia mejora al bajar.
 * Con una sola sesión, sin tendencia (`mejora` null).
 */
export function tendenciaVariante(v: Pick<ResumenVariante, 'cambio' | 'metrica' | 'desde'>): { texto: string; mejora: boolean | null } {
  if (v.cambio === null) return { texto: 'Una sesión en su gimnasio', mejora: null }
  const unidad = v.metrica === 'reps' ? 'reps' : 'kg'
  if (Math.abs(v.cambio) < 0.05) return { texto: `Sin cambios desde el ${formatDiaMes(v.desde)}`, mejora: null }
  const signo = v.cambio > 0 ? '+' : '−'
  return { texto: `${signo}${formatNumber(Math.abs(v.cambio), 1)} ${unidad} desde el ${formatDiaMes(v.desde)}`, mejora: v.metrica === 'asistencia' ? v.cambio < 0 : v.cambio > 0 }
}

/** Trazo de una minigráfica en un lienzo `ancho` × `alto`, ceñido al mínimo y al máximo; null con menos de dos puntos. */
export function trazoMini(valores: number[], ancho: number, alto: number, margen = 2): { d: string; ultimo: { x: number; y: number } } | null {
  if (valores.length < 2) return null
  const min = Math.min(...valores), max = Math.max(...valores)
  const xy = valores.map((v, i) => [
    Math.round((margen + (i / (valores.length - 1)) * (ancho - 2 * margen)) * 10) / 10,
    Math.round((max === min ? alto / 2 : margen + ((max - v) / (max - min)) * (alto - 2 * margen)) * 10) / 10,
  ] as const)
  return { d: xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(''), ultimo: { x: xy[xy.length - 1][0], y: xy[xy.length - 1][1] } }
}

export interface SesionHistorial { workoutId: number; inicio: number; mejor: MejorSerie; series: number; rirMedio: number | null }
export interface RecordVigente { etiqueta: string; texto: string; inicio: number }
export interface HistorialEjercicio {
  modo: ModoCarga
  /** Las últimas sesiones terminadas, la más reciente primero (como mucho `n`). */
  sesiones: SesionHistorial[]
  /** Valores para la minigráfica (1RM, carga, ayuda o reps según el modo), de la más antigua a la más reciente. */
  puntos: number[]
  /** Qué miden los puntos: «Mejor 1RM estimado», «Peso máximo», «Lastre máximo», «Menor ayuda» o «Más repeticiones». */
  mide: string
  total: number
  records: RecordVigente[]
}

/**
 * Historial de un ejercicio para consultarlo sin salir de la sesión (ENT-04): las sesiones terminadas antes de `antesDe`
 * comparables con `referencia` (mismo ejercicio, modo de carga, variante y, en máquinas, gimnasio: `records.claveGrupo`),
 * su mejor serie, cuántas series y el RIR medio; los valores de la minigráfica y los récords vigentes de cada tipo.
 * Calentamientos y series sin hacer quedan fuera, como en los récords. `null` sin ninguna sesión comparable.
 */
export function historialEjercicio(series: SetEntry[], workouts: Pick<Workout, 'id' | 'inicio' | 'fin'>[], referencia: Pick<SetEntry, 'exerciseId'> & Partial<SerieEjecucion>, antesDe: number, n = 5, nPuntos = 8): HistorialEjercicio | null {
  const terminadas = new Map(workouts.filter(w => w.fin !== undefined && w.inicio < antesDe).map(w => [w.id, w.inicio]))
  const previas = series.filter(s => s.exerciseId === referencia.exerciseId && terminadas.has(s.workoutId))
  const grupo = (acumularComparables(new Map(), previas).get(claveGrupo(referencia)) ?? []) as (SetEntry & MejorSerie)[]
  if (!grupo.length) return null
  const modo = modoCarga(grupo[0])
  const conRM = modo === 'externa' && !grupo[0].ejecucion && !grupo[0].excentricaSeg
  const porSesion = new Map<number, (SetEntry & MejorSerie)[]>()
  for (const s of grupo) porSesion.set(s.workoutId, [...(porSesion.get(s.workoutId) ?? []), s])
  const todas = [...porSesion].map(([workoutId, ss]) => {
    const rirs = ss.map(s => s.rir).filter((r): r is number => typeof r === 'number')
    return { workoutId, inicio: terminadas.get(workoutId)!, ss, mejor: mejorDe(ss.map(s => ({ peso: s.peso, reps: s.reps })), modo), series: ss.length,
      rirMedio: rirs.length ? rirs.reduce((a, b) => a + b, 0) / rirs.length : null }
  }).sort((a, b) => a.inicio - b.inicio || a.workoutId - b.workoutId)
  const valor = (ss: MejorSerie[]) => modo === 'corporal' ? Math.max(...ss.map(s => s.reps)) : modo === 'asistencia' ? Math.min(...ss.map(s => s.peso))
    : conRM ? Math.max(...ss.map(s => epley1RM(s.peso, s.reps))) : Math.max(...ss.map(s => s.peso))
  return {
    modo,
    sesiones: todas.slice(-n).reverse().map(({ ss, ...s }) => { void ss; return s }),
    puntos: todas.slice(-nPuntos).map(s => valor(s.ss)),
    mide: modo === 'corporal' ? 'Más repeticiones' : modo === 'asistencia' ? 'Menor ayuda' : modo === 'lastre' ? 'Lastre máximo' : conRM ? 'Mejor 1RM estimado' : 'Peso máximo',
    total: todas.length,
    records: recordsVigentes(todas, modo, conRM, referencia.peso),
  }
}

/** El récord vigente de cada tipo y la primera sesión en que se logró; las reps, con el peso de la serie de referencia si ya se usó. */
function recordsVigentes(sesiones: { inicio: number; ss: MejorSerie[] }[], modo: ModoCarga, conRM: boolean, pesoReferencia?: number): RecordVigente[] {
  const series = sesiones.flatMap(s => s.ss.map(x => ({ ...x, inicio: s.inicio })))
  const primera = (cumple: (x: MejorSerie) => boolean) => series.find(cumple)!.inicio
  const kg = (n: number) => `${formatNumber(n, 2)} kg`
  const out: RecordVigente[] = []
  if (modo === 'corporal') {
    const reps = Math.max(...series.map(s => s.reps))
    return [{ etiqueta: 'Más repeticiones', texto: `${formatInt(reps)} reps`, inicio: primera(s => s.reps === reps) }]
  }
  if (modo === 'asistencia') {
    const minima = Math.min(...series.map(s => s.peso))
    const reps = Math.max(...series.filter(s => s.peso === minima).map(s => s.reps))
    out.push({ etiqueta: 'Menos ayuda', texto: textoMejorSerie({ peso: minima, reps }, modo), inicio: primera(s => s.peso === minima && s.reps === reps) })
  } else {
    const maximo = Math.max(...series.map(s => s.peso))
    const reps = Math.max(...series.filter(s => s.peso === maximo).map(s => s.reps))
    out.push({ etiqueta: modo === 'lastre' ? 'Lastre máximo' : 'Peso máximo', texto: textoMejorSerie({ peso: maximo, reps }, modo), inicio: primera(s => s.peso === maximo && s.reps === reps) })
    if (conRM) {
      const rm = Math.max(...series.map(s => epley1RM(s.peso, s.reps)))
      out.push({ etiqueta: '1RM estimado', texto: kg(rm), inicio: primera(s => epley1RM(s.peso, s.reps) === rm) })
    }
  }
  if (pesoReferencia !== undefined && series.some(s => s.peso === pesoReferencia)) {
    const reps = Math.max(...series.filter(s => s.peso === pesoReferencia).map(s => s.reps))
    const con = modo === 'lastre' ? `+${kg(pesoReferencia)}` : modo === 'asistencia' ? `${kg(pesoReferencia)} de ayuda` : kg(pesoReferencia)
    out.push({ etiqueta: `Más reps con ${con}`, texto: `${formatInt(reps)} reps`, inicio: primera(s => s.peso === pesoReferencia && s.reps === reps) })
  }
  return out
}
