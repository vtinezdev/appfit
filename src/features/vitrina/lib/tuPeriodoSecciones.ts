// Las secciones de «Tu mes» / «Tu año» (B15): calendario, lo mejor del periodo (Cumbres, Caminos, Logros), Entreno con sus
// récords, Nutrición frente al objetivo y Actividades. Funciones puras; sin comparaciones con el periodo anterior
// (decisión de Víctor: cada mes se cuenta por sí solo).
import type { Actividad, Entry, Exercise, Objetivos, SetEntry, TipoActividad, Workout } from '../../../shared/db/types'
import { addDays, parseISODate, toISODate } from '../../../shared/lib/dates'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { metrosEntre as metrosCumbresEntre, type Expedicion as ExpedicionCumbre, type ResultadoCumbres } from '../../cumbres/lib/cumbres'
import { metrosEntre as metrosCaminosEntre, type Expedicion as ExpedicionCamino, type ResultadoCaminos } from '../../caminos/lib/caminos'
import { recordsDeEntreno } from '../../gym/lib/records'
import { resumenSemanal } from '../../gym/lib/resumenSemanal'
import { esEfectiva, volumenSets } from '../../gym/lib/workout'
import { resumenPeriodo as resumenNutricion, distribucionPCG, type Macros } from '../../nutricion/lib/nutrition'
import type { Logro } from './logros'
import type { Periodo } from './tuPeriodo'

const enPeriodo = (p: Pick<Periodo, 'desde' | 'hasta'>, fecha: string) => fecha >= p.desde && fecha <= p.hasta
const fechaDe = (w: Pick<Workout, 'inicio'>) => toISODate(new Date(w.inicio))

/** Las fechas del periodo, de la primera a la última. */
export function fechasDelPeriodo(p: Pick<Periodo, 'desde' | 'hasta'>): string[] {
  const fechas: string[] = []
  for (let f = p.desde; f <= p.hasta; f = addDays(f, 1)) fechas.push(f)
  return fechas
}

// ── Calendario ──

export interface DiaCalendario {
  fecha: string
  /** Día del mes. */
  dia: number
  entreno: boolean
  actividad: boolean
  /** Comidas registradas ese día. */
  comidas: boolean
}

export interface CalendarioPeriodo {
  /** Huecos antes del día 1 en una semana que empieza en lunes. */
  hueco: number
  dias: DiaCalendario[]
}

/** El mes día a día (solo los meses: un año no cabe en una rejilla así). */
export function calendarioPeriodo(p: Periodo, d: { workouts: readonly Workout[]; actividades: readonly Pick<Actividad, 'fecha' | 'enCurso'>[]; entries: readonly Pick<Entry, 'fecha' | 'kcal'>[] }): CalendarioPeriodo | null {
  if (p.tipo !== 'mes') return null
  const entrenos = new Set(d.workouts.filter((w) => w.fin !== undefined).map(fechaDe))
  const actividades = new Set(d.actividades.filter((a) => !a.enCurso).map((a) => a.fecha))
  const comidas = new Set(d.entries.filter((e) => e.kcal > 0).map((e) => e.fecha))
  return {
    hueco: (parseISODate(p.desde).getDay() + 6) % 7,
    dias: fechasDelPeriodo(p).map((fecha) => ({ fecha, dia: parseISODate(fecha).getDate(), entreno: entrenos.has(fecha), actividad: actividades.has(fecha), comidas: comidas.has(fecha) })),
  }
}

// ── Lo mejor del periodo ──

export interface CumbresPeriodo {
  metros: number
  /** Coronadas en el periodo, en orden. */
  coronadas: ExpedicionCumbre[]
  /** La que se sube ahora, si avanzó en el periodo y aún no se ha coronado. */
  enCurso: ExpedicionCumbre | null
}

export function cumbresDelPeriodo(p: Periodo, r: ResultadoCumbres | null): CumbresPeriodo | null {
  if (!r) return null
  const metros = Math.round(metrosCumbresEntre(r.tramos, p.desde, p.hasta))
  const coronadas = r.coronadas.filter((x) => x.cumbre !== null && enPeriodo(p, x.cumbre.fecha))
  const idxActual = r.expediciones.length - 1
  const avanzoActual = r.tramos.some((t) => t.expedicion === idxActual && enPeriodo(p, t.fecha))
  const enCurso = r.actual.cumbre === null && avanzoActual ? r.actual : null
  if (metros <= 0 && coronadas.length === 0) return null
  return { metros, coronadas, enCurso }
}

export interface CaminosPeriodo {
  metros: number
  completados: ExpedicionCamino[]
  enCurso: ExpedicionCamino | null
}

export function caminosDelPeriodo(p: Periodo, r: ResultadoCaminos | null): CaminosPeriodo | null {
  if (!r) return null
  const metros = Math.round(metrosCaminosEntre(r.tramos, p.desde, p.hasta))
  const completados = r.completadas.filter((x) => x.llegada !== null && enPeriodo(p, x.llegada.fecha))
  const idxActual = r.expediciones.length - 1
  const avanzoActual = r.tramos.some((t) => t.expedicion === idxActual && enPeriodo(p, t.fecha))
  const enCurso = r.actual.llegada === null && avanzoActual ? r.actual : null
  if (metros <= 0 && completados.length === 0) return null
  return { metros, completados, enCurso }
}

export interface LogroDelPeriodo {
  logro: Logro
  /** El nivel más alto alcanzado en el periodo (1 = I), o `null` en los repetibles. */
  nivel: number | null
  /** Cuántas veces (niveles o repeticiones) se consiguió en el periodo. */
  veces: number
  /** La última vez. */
  fecha: string
}

/** Una fila por logro conseguido en el periodo (los repetibles, con cuántas veces), del más reciente al más antiguo. */
export function logrosDelPeriodo(p: Periodo, logros: readonly Logro[] | null): LogroDelPeriodo[] {
  if (!logros) return []
  const hechos: LogroDelPeriodo[] = []
  for (const logro of logros) {
    const niveles = logro.niveles.flatMap((n, i) => (n && enPeriodo(p, n.fecha) ? [{ nivel: i + 1, fecha: n.fecha }] : []))
    const veces = (logro.veces ?? []).filter((v) => enPeriodo(p, v.fecha)).map((v) => v.fecha)
    const fechas = [...niveles.map((n) => n.fecha), ...veces].sort()
    if (fechas.length === 0) continue
    hechos.push({ logro, nivel: niveles.length ? niveles[niveles.length - 1].nivel : null, veces: fechas.length, fecha: fechas[fechas.length - 1] })
  }
  return hechos.sort((a, b) => b.fecha.localeCompare(a.fecha) || a.logro.nombre.localeCompare(b.logro.nombre, 'es'))
}

// ── Entreno ──

/** El mejor récord del periodo de un ejercicio, con una sola cifra. */
export interface RecordDelPeriodo {
  exerciseId: number
  nombre: string
  variante?: string
  /** `peso`: kg máximos; `lastre`: kg añadidos; `reps`: sin peso; `asistencia`: la menor ayuda. */
  tipo: 'peso' | 'lastre' | 'reps' | 'asistencia'
  valor: number
  /** Cuánto mejora a la marca de antes del periodo (kg o reps, siempre positivo). */
  mejora: number
  fecha: string
}

const PRIORIDAD: Record<RecordDelPeriodo['tipo'], number> = { peso: 0, lastre: 1, asistencia: 2, reps: 3 }

/**
 * Los récords del periodo, uno por ejercicio (y variante): el peso máximo; con lastre, los kg de lastre; con asistencia,
 * la menor; sin peso, las repeticiones. Las repeticiones con peso y el 1RM estimado no salen: lo que cuenta es el peso
 * (decisión de Víctor). Ordenados por tipo y, dentro, de más a menos.
 */
export function recordsDelPeriodo(p: Periodo, d: { workouts: readonly Workout[]; sets: readonly SetEntry[]; exercises: readonly Exercise[] }): RecordDelPeriodo[] {
  const terminados = d.workouts.filter((w) => w.fin !== undefined)
  const delPeriodo = terminados.filter((w) => enPeriodo(p, fechaDe(w))).sort((a, b) => a.inicio - b.inicio)
  const nombres = new Map(d.exercises.map((e) => [e.id, e.nombre]))
  const mejores = new Map<string, RecordDelPeriodo & { anterior: number }>()
  for (const w of delPeriodo) {
    for (const r of recordsDeEntreno(w.id, terminados, [...d.sets])) {
      const tipo: RecordDelPeriodo['tipo'] | null = r.tipo === 'asistencia' ? 'asistencia'
        : r.tipo === 'peso' ? (r.modoCarga === 'lastre' ? 'lastre' : 'peso')
          : r.tipo === 'reps' && r.modoCarga === 'corporal' ? 'reps' : null
      if (!tipo) continue
      const clave = `${r.exerciseId}:${r.variante ?? ''}`
      const previo = mejores.get(clave)
      const mejor = (v: number, ref: number) => (tipo === 'asistencia' ? v < ref : v > ref)
      if (previo && (PRIORIDAD[previo.tipo] < PRIORIDAD[tipo] || (previo.tipo === tipo && !mejor(r.valor, previo.valor)))) continue
      // La marca de antes del periodo es la `anterior` del primer récord de ese tipo.
      const anterior = previo && previo.tipo === tipo ? previo.anterior : r.anterior
      mejores.set(clave, { exerciseId: r.exerciseId, nombre: nombres.get(r.exerciseId) ?? 'Ejercicio', ...(r.variante ? { variante: r.variante } : {}), tipo, valor: r.valor, anterior, mejora: 0, fecha: fechaDe(w) })
    }
  }
  return [...mejores.values()]
    .map(({ anterior, ...r }) => ({ ...r, mejora: Math.round(Math.abs(r.valor - anterior) * 10) / 10 }))
    .sort((a, b) => PRIORIDAD[a.tipo] - PRIORIDAD[b.tipo] || (a.tipo === 'asistencia' ? a.valor - b.valor : b.valor - a.valor) || a.nombre.localeCompare(b.nombre, 'es'))
}

export interface TramoEntreno {
  /** «S1» en un mes, «E» en un año. */
  etiqueta: string
  /** Para lectores de pantalla: «del 13 al 19», «enero». */
  nombre: string
  toneladas: number
}

export interface EntrenoPeriodo {
  entrenos: number
  toneladas: number
  series: number
  /** Duración media de un entreno, en minutos. */
  duracionMediaMin: number
  /** Semanas (lunes a domingo, recortadas al mes) o, en un año, meses. */
  tramos: TramoEntreno[]
  /** Índice del tramo con más toneladas, o `null` si ninguno tiene. */
  mejorTramo: number | null
  /** Los cinco músculos con más series efectivas. */
  grupos: { nombre: string; series: number }[]
  records: RecordDelPeriodo[]
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const toneladasDe = (kg: number) => Math.round(kg / 100) / 10

function tramosDe(p: Periodo): { desde: string; hasta: string; etiqueta: string; nombre: string }[] {
  if (p.tipo === 'ano') {
    const y = p.desde.slice(0, 4)
    return MESES.map((m, i) => {
      const mm = String(i + 1).padStart(2, '0')
      return { desde: `${y}-${mm}-01`, hasta: toISODate(new Date(Number(y), i + 1, 0)), etiqueta: m[0].toUpperCase(), nombre: m }
    })
  }
  const tramos: { desde: string; hasta: string; etiqueta: string; nombre: string }[] = []
  let desde = p.desde
  while (desde <= p.hasta) {
    const domingo = addDays(desde, 6 - ((parseISODate(desde).getDay() + 6) % 7))
    const hasta = domingo > p.hasta ? p.hasta : domingo
    const dia = (f: string) => parseISODate(f).getDate()
    tramos.push({ desde, hasta, etiqueta: `S${tramos.length + 1}`, nombre: desde === hasta ? `el ${dia(desde)}` : `del ${dia(desde)} al ${dia(hasta)}` })
    desde = addDays(hasta, 1)
  }
  return tramos
}

export function entrenoDelPeriodo(p: Periodo, d: { workouts: readonly Workout[]; sets: readonly SetEntry[]; exercises: readonly Exercise[] }): EntrenoPeriodo | null {
  const delPeriodo = d.workouts.filter((w) => w.fin !== undefined && enPeriodo(p, fechaDe(w)))
  if (delPeriodo.length === 0) return null
  const porWorkout = new Map<number, SetEntry[]>()
  for (const s of d.sets) {
    const lista = porWorkout.get(s.workoutId)
    if (lista) lista.push(s)
    else porWorkout.set(s.workoutId, [s])
  }
  const setsDe = (ws: readonly Workout[]) => ws.flatMap((w) => porWorkout.get(w.id) ?? [])
  const tramos = tramosDe(p).map((t) => ({ etiqueta: t.etiqueta, nombre: t.nombre, toneladas: toneladasDe(volumenSets(setsDe(delPeriodo.filter((w) => fechaDe(w) >= t.desde && fechaDe(w) <= t.hasta)))) }))
  const max = Math.max(...tramos.map((t) => t.toneladas))
  const resumen = resumenSemanal(p.desde, p.hasta, [...d.workouts], [...d.sets], [...d.exercises])
  const duracion = delPeriodo.reduce((ms, w) => ms + Math.max(0, (w.fin ?? w.inicio) - w.inicio), 0)
  return {
    entrenos: delPeriodo.length,
    toneladas: toneladasDe(volumenSets(setsDe(delPeriodo))),
    series: setsDe(delPeriodo).filter((s) => esEfectiva(s) && s.reps > 0).length,
    duracionMediaMin: Math.round(duracion / delPeriodo.length / 60000),
    tramos,
    mejorTramo: max > 0 ? tramos.findIndex((t) => t.toneladas === max) : null,
    grupos: resumen.porMusculo.slice(0, 5).map((g) => ({ nombre: g.nombre, series: g.series })),
    records: recordsDelPeriodo(p, d),
  }
}

// ── Nutrición ──

/** Margen alrededor del objetivo de kcal del día (decisión de Víctor: ±10 %). */
export const MARGEN_OBJETIVO = 0.1

export interface NutricionPeriodo {
  /** Días con comidas (sin los cheat days, como en Resumen). */
  diasRegistrados: number
  /** Días del periodo hasta hoy. */
  diasDelPeriodo: number
  media: Macros & { kcal: number }
  /** Media de los objetivos de los días registrados (cada uno con el suyo). */
  objetivo: Objetivos
  /** Porcentaje de kcal de cada macro. */
  reparto: { prot: number; carb: number; grasa: number }
  porDebajo: number
  enObjetivo: number
  porEncima: number
  /** Las kcal de cada franja si todos los días tienen el mismo objetivo; si no, `null`. */
  franja: { min: number; max: number } | null
}

export function nutricionDelPeriodo(p: Periodo, d: { entries: readonly Entry[]; objetivos: ReadonlyMap<string, Objetivos>; cheatDays: ReadonlySet<string> }, hoy: string): NutricionPeriodo | null {
  const fechas = fechasDelPeriodo(p).filter((f) => f <= hoy)
  const r = resumenNutricion([...d.entries], fechas, hoy, d.cheatDays)
  if (r.diasRegistrados === 0) return null
  const kcalPorDia = new Map<string, number>()
  for (const e of d.entries) if (enPeriodo(p, e.fecha) && e.fecha <= hoy) kcalPorDia.set(e.fecha, (kcalPorDia.get(e.fecha) ?? 0) + e.kcal)
  const registrados = [...kcalPorDia.keys()].filter((f) => !d.cheatDays.has(f) && (kcalPorDia.get(f) ?? 0) > 0).sort()
  const objetivos = registrados.map((f) => d.objetivos.get(f)).filter((o): o is Objetivos => !!o)
  const media = (k: keyof Objetivos) => (objetivos.length ? Math.round(objetivos.reduce((a, o) => a + o[k], 0) / objetivos.length) : 0)
  let porDebajo = 0, enObjetivo = 0, porEncima = 0
  for (const f of registrados) {
    const objetivo = d.objetivos.get(f)?.kcal ?? 0
    if (objetivo <= 0) continue
    const kcal = kcalPorDia.get(f) ?? 0
    if (kcal < objetivo * (1 - MARGEN_OBJETIVO)) porDebajo++
    else if (kcal > objetivo * (1 + MARGEN_OBJETIVO)) porEncima++
    else enObjetivo++
  }
  const kcals = new Set(objetivos.map((o) => Math.round(o.kcal)))
  const unico = kcals.size === 1 ? [...kcals][0] : null
  return {
    diasRegistrados: r.diasRegistrados,
    diasDelPeriodo: fechas.length,
    media: { kcal: Math.round(r.media.kcal), prot: Math.round(r.media.prot), carb: Math.round(r.media.carb), grasa: Math.round(r.media.grasa) },
    objetivo: { kcal: media('kcal'), prot: media('prot'), carb: media('carb'), grasa: media('grasa') },
    reparto: distribucionPCG(r.media),
    porDebajo, enObjetivo, porEncima,
    franja: unico && unico > 0 ? { min: Math.round(unico * (1 - MARGEN_OBJETIVO)), max: Math.round(unico * (1 + MARGEN_OBJETIVO)) } : null,
  }
}

// ── Actividades ──

export interface ActividadesPeriodo {
  metros: number
  salidas: number
  segundos: number
  /** Desnivel positivo sumado, o `null` si ninguna salida lo tiene. */
  desnivel: number | null
  porTipo: { tipo: TipoActividad; metros: number; salidas: number }[]
  /** La de más distancia. */
  masLarga: Actividad
}

export function actividadesDelPeriodo(p: Periodo, actividades: readonly Actividad[]): ActividadesPeriodo | null {
  const del = actividades.filter((a) => !a.enCurso && enPeriodo(p, a.fecha))
  if (del.length === 0) return null
  const tipos = new Map<TipoActividad, { metros: number; salidas: number }>()
  for (const a of del) {
    const t = tipos.get(a.tipo) ?? { metros: 0, salidas: 0 }
    tipos.set(a.tipo, { metros: t.metros + a.distanciaM, salidas: t.salidas + 1 })
  }
  const conDesnivel = del.filter((a) => a.desnivelM !== undefined)
  return {
    metros: del.reduce((m, a) => m + a.distanciaM, 0),
    salidas: del.length,
    segundos: del.reduce((s, a) => s + a.duracionSeg, 0),
    desnivel: conDesnivel.length ? Math.round(conDesnivel.reduce((m, a) => m + (a.desnivelM ?? 0), 0)) : null,
    porTipo: [...tipos].map(([tipo, t]) => ({ tipo, ...t })).sort((a, b) => b.metros - a.metros || b.salidas - a.salidas),
    masLarga: [...del].sort((a, b) => b.distanciaM - a.distanciaM || a.inicio - b.inicio)[0],
  }
}

// ── Frases ──

const plural = (n: number, uno: string, varios: string) => `${formatInt(n)} ${n === 1 ? uno : varios}`
const enumerar = (partes: string[]) => (partes.length <= 1 ? partes.join('') : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`)

export interface PartesFrase {
  entrenos: number | null
  cumbres: number | null
  caminos: number | null
  km: number | null
  diasRegistrados: number | null
}

/** «14 entrenos, 2 cumbres y 26 días registrados.» Tres piezas como mucho; `null` si no hay nada que contar. */
export function frasePeriodo(f: PartesFrase): string | null {
  const partes = [
    f.entrenos ? plural(f.entrenos, 'entreno', 'entrenos') : null,
    f.cumbres ? plural(f.cumbres, 'cumbre', 'cumbres') : null,
    f.caminos ? plural(f.caminos, 'camino terminado', 'caminos terminados') : null,
    f.km ? `${formatInt(f.km)} km` : null,
    f.diasRegistrados ? plural(f.diasRegistrados, 'día registrado', 'días registrados') : null,
  ].filter((x): x is string => !!x).slice(0, 3)
  return partes.length ? `${enumerar(partes)}.` : null
}

/** La línea de la tarjeta de Inicio con lo conseguido: «2 cumbres · 1 camino · 9 récords · 2 logros». `null` sin nada. */
export function lineaMomentos(m: { cumbres: number; caminos: number; records: number; logros: number }): string | null {
  const partes = [
    m.cumbres ? plural(m.cumbres, 'cumbre', 'cumbres') : null,
    m.caminos ? plural(m.caminos, 'camino', 'caminos') : null,
    m.records ? plural(m.records, 'récord', 'récords') : null,
    m.logros ? plural(m.logros, 'logro', 'logros') : null,
  ].filter((x): x is string => !!x)
  return partes.length ? partes.join(' · ') : null
}

// ── Imagen para compartir ──

/** Un récord en una sola cifra: «125 kg», «+15 kg» de lastre, «29 reps» sin peso. */
export function cifraRecord(r: Pick<RecordDelPeriodo, 'tipo' | 'valor'>): string {
  const kg = formatNumber(r.valor, 1)
  return r.tipo === 'reps' ? `${formatInt(r.valor)} reps` : r.tipo === 'lastre' ? `+${kg} kg` : `${kg} kg`
}

/** Las cuatro cifras de la imagen, según lo que se usa: entrenos, toneladas, km y días registrados (si falta alguna, los metros de Cumbres). */
export function cifrasImagen(s: { entreno: EntrenoPeriodo | null; nutricion: NutricionPeriodo | null; actividades: ActividadesPeriodo | null; cumbres: CumbresPeriodo | null }): { rotulo: string; valor: string; unidad?: string }[] {
  return [
    s.entreno && { rotulo: 'Entrenos', valor: formatInt(s.entreno.entrenos) },
    s.entreno && { rotulo: 'Volumen', valor: formatNumber(s.entreno.toneladas, 1), unidad: 't' },
    s.actividades && { rotulo: 'Distancia', valor: formatInt(Math.round(s.actividades.metros / 1000)), unidad: 'km' },
    s.nutricion && { rotulo: 'Días registrados', valor: formatInt(s.nutricion.diasRegistrados) },
    s.cumbres && s.cumbres.metros > 0 && { rotulo: 'Subidos', valor: formatInt(s.cumbres.metros), unidad: 'm' },
  ].filter((c): c is { rotulo: string; valor: string; unidad?: string } => !!c).slice(0, 4)
}

/**
 * Los mejores momentos de la imagen, en orden: cada cumbre y cada camino terminados, el récord de más peso (con cuántos
 * más hubo) y los logros. La imagen pinta los que quepan.
 */
export function momentosImagen(s: { cumbres: CumbresPeriodo | null; caminos: CaminosPeriodo | null; entreno: EntrenoPeriodo | null; logros: readonly LogroDelPeriodo[] }, fecha: (iso: string) => string): { icono: 'mountain' | 'route' | 'trophy' | 'sparkles'; texto: string; detalle?: string }[] {
  const records = s.entreno?.records ?? []
  return [
    ...(s.cumbres?.coronadas ?? []).map((x) => ({ icono: 'mountain' as const, texto: x.montana.nombre, detalle: x.cumbre ? `Cumbre · ${fecha(x.cumbre.fecha)}` : 'Cumbre' })),
    ...(s.caminos?.completados ?? []).map((x) => ({ icono: 'route' as const, texto: x.ruta.nombre, detalle: x.llegada ? `Camino · ${fecha(x.llegada.fecha)}` : 'Camino' })),
    ...(records.length ? [{ icono: 'trophy' as const, texto: `${records[0].nombre} · ${cifraRecord(records[0])}`, detalle: records.length > 1 ? `y ${plural(records.length - 1, 'récord más', 'récords más')}` : 'Récord' }] : []),
    ...(s.logros.length ? [{ icono: 'sparkles' as const, texto: plural(s.logros.length, 'logro nuevo', 'logros nuevos'), detalle: 'Vitrina' }] : []),
  ]
}
