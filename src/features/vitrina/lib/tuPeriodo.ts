// «Tu mes» y «Tu año» (B15): los primeros días de cada mes, un resumen del mes que acaba de cerrar (en enero, del año).
// Funciones puras: qué periodo toca y sus cifras. Todo local; se comparte como imagen solo si la persona quiere.
import type { Actividad, Entry, Exercise, SetEntry, Workout } from '../../../shared/db/types'
import { toISODate } from '../../../shared/lib/dates'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { metrosEntre } from '../../cumbres/lib/cumbres'
import type { TramoSubido } from '../../cumbres/lib/cumbres'
import { recordsDeEntreno } from '../../gym/lib/records'
import { resumenSemanal } from '../../gym/lib/resumenSemanal'
import { volumenSets } from '../../gym/lib/workout'
import { plantasDistintas } from '../../nutricion/lib/herbario'

/** La tarjeta sale en Inicio del día 1 al 7 de cada mes. */
export const DIAS_TARJETA = 7

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export interface Periodo {
  tipo: 'mes' | 'ano'
  /** YYYY-MM o YYYY: lo que guarda `Settings.resumenMesCerrado` al cerrarla. */
  clave: string
  desde: string
  hasta: string
  /** «Tu octubre», «Tu 2026». */
  titulo: string
  /** «octubre de 2026», «2026». */
  subtitulo: string
}

/** El periodo de un mes YYYY-MM. */
export function periodoMes(mes: string): Periodo {
  const [y, m] = mes.split('-').map(Number)
  return { tipo: 'mes', clave: mes, desde: `${mes}-01`, hasta: toISODate(new Date(y, m, 0)), titulo: `Tu ${MESES[m - 1]}`, subtitulo: `${MESES[m - 1]} de ${y}` }
}

/** El periodo de un año. */
export const periodoAno = (ano: number): Periodo => ({ tipo: 'ano', clave: String(ano), desde: `${ano}-01-01`, hasta: `${ano}-12-31`, titulo: `Tu ${ano}`, subtitulo: String(ano) })

/**
 * El periodo que toca resumir hoy: del 1 al 7, el mes anterior (en enero, el año anterior); `null` el resto del mes o si ya
 * se cerró su tarjeta.
 */
export function periodoAResumir(hoy: string, cerrado?: string): Periodo | null {
  const [y, m, d] = hoy.split('-').map(Number)
  if (d > DIAS_TARJETA) return null
  const p = m === 1 ? periodoAno(y - 1) : periodoMes(`${y}-${String(m - 1).padStart(2, '0')}`)
  return p.clave === cerrado ? null : p
}

export interface DatosPeriodo {
  workouts: readonly Workout[]
  sets: readonly SetEntry[]
  exercises: readonly Exercise[]
  actividades: readonly Pick<Actividad, 'fecha' | 'distanciaM' | 'enCurso'>[]
  entries: readonly Entry[]
  /** Categorías de los alimentos de esas entradas (`foodsRepo.categoriasDeEntradas`), para las plantas. */
  categorias: ReadonlyMap<string, string>
  /** Metros de Cumbres; `null` con la gamificación oculta o sin montaña elegida. */
  tramos: readonly TramoSubido[] | null
}

export interface ResumenPeriodo {
  entrenos: number
  toneladas: number
  records: number
  /** Metros subidos en Cumbres, o `null` sin Cumbres. */
  metros: number | null
  km: number
  diasRegistrados: number
  plantas: number
  /** El grupo con más series del periodo, o `null`. */
  grupo: string | null
}

const fechaDe = (w: Pick<Workout, 'inicio'>) => toISODate(new Date(w.inicio))

/** Cifras del periodo. */
export function resumirPeriodo(p: Periodo, d: DatosPeriodo): ResumenPeriodo {
  const terminados = d.workouts.filter((w) => w.fin !== undefined)
  const delPeriodo = terminados.filter((w) => fechaDe(w) >= p.desde && fechaDe(w) <= p.hasta)
  const ids = new Set(delPeriodo.map((w) => w.id))
  const sets = d.sets.filter((s) => ids.has(s.workoutId))
  const entries = d.entries.filter((e) => e.fecha >= p.desde && e.fecha <= p.hasta)
  const resumen = resumenSemanal(p.desde, p.hasta, [...d.workouts], [...d.sets], [...d.exercises])
  return {
    entrenos: delPeriodo.length,
    toneladas: Math.round(volumenSets(sets) / 100) / 10,
    records: delPeriodo.reduce((n, w) => n + recordsDeEntreno(w.id, terminados, [...d.sets]).length, 0),
    metros: d.tramos ? Math.round(metrosEntre(d.tramos, p.desde, p.hasta)) : null,
    km: Math.round(d.actividades.filter((a) => !a.enCurso && a.fecha >= p.desde && a.fecha <= p.hasta).reduce((m, a) => m + a.distanciaM, 0) / 1000),
    diasRegistrados: new Set(entries.filter((e) => e.kcal > 0).map((e) => e.fecha)).size,
    plantas: plantasDistintas(entries, d.categorias).length,
    grupo: resumen.porMusculo[0]?.nombre ?? null,
  }
}

export interface CifraPeriodo { rotulo: string; valor: string; unidad?: string }

/** Qué partes usa la persona (módulos de B9): sin ellas, sus cifras no salen. */
export interface UsaPeriodo { gym: boolean; actividades: boolean; nutricion: boolean }

/** Las cifras que se enseñan, en orden; las de módulos ocultos o sin Cumbres no salen. */
export function cifrasPeriodo(r: ResumenPeriodo, usa: UsaPeriodo): CifraPeriodo[] {
  return [
    usa.gym && { rotulo: 'Entrenos', valor: formatInt(r.entrenos) },
    usa.gym && { rotulo: 'Toneladas', valor: formatNumber(r.toneladas, 1), unidad: 't' },
    usa.gym && { rotulo: 'Récords', valor: formatInt(r.records) },
    r.metros !== null && { rotulo: 'Metros subidos', valor: formatInt(r.metros), unidad: 'm' },
    usa.actividades && { rotulo: 'Km', valor: formatInt(r.km), unidad: 'km' },
    usa.nutricion && { rotulo: 'Días registrados', valor: formatInt(r.diasRegistrados) },
    usa.nutricion && { rotulo: 'Plantas distintas', valor: formatInt(r.plantas) },
  ].filter((c): c is CifraPeriodo => !!c)
}

/** La línea corta de la tarjeta de Inicio: «14 entrenos · 38 t · 9 récords · 2.140 m». */
export function lineaTarjeta(cifras: readonly CifraPeriodo[]): string {
  return cifras.slice(0, 4).map((c) => `${c.valor}${c.unidad ? ` ${c.unidad}` : ''}${c.unidad ? '' : ` ${c.rotulo.toLowerCase()}`}`).join(' · ')
}
