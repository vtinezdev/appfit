// Muro de récords de la Vitrina: la mejor marca vigente de cada ejercicio (y variante), con el día en que se logró.
// Reutiliza la normalización de los récords de Gym (`acumularComparables`): mismas series válidas y mismas variantes.
import type { ModoCarga, SetEntry, Workout } from '../../../shared/db/types'
import { formatFriendly, toISODate } from '../../../shared/lib/dates'
import { formatNumber } from '../../../shared/lib/format'
import { modoCarga } from '../../gym/lib/carga'
import { contextoSerie } from '../../gym/lib/ejecucion'
import { acumularComparables } from '../../gym/lib/records'
import { epley1RM } from '../../gym/lib/workout'

export type TipoMarca = 'peso' | '1rm' | 'reps' | 'asistencia'

export interface Marca {
  tipo: TipoMarca
  valor: number
  /** Día en que se logró por primera vez. */
  fecha: string
}

export interface MuroEjercicio {
  exerciseId: number
  modo: ModoCarga
  /** Variante (ejecución, agarre, técnica), si no es la convencional. */
  variante?: string
  marcas: Marca[]
  /** Fecha de la marca más reciente, para ordenar. */
  ultima: string
  /** La marca principal (la primera) en cada una de las últimas `SESIONES_EVOLUCION` sesiones: su mejor serie, en orden. */
  evolucion: number[]
  /**
   * Cuánto ha mejorado la marca principal desde la primera sesión de `evolucion` (en asistencia, cuánta menos);
   * `null` con menos de dos sesiones o si no ha mejorado.
   */
  mejora: number | null
}

/** Sesiones que dibuja la minigráfica de cada récord. */
export const SESIONES_EVOLUCION = 10

type SerieMuro = SetEntry

/** Mejor valor de una serie de candidatos; a igualdad, el más antiguo (cuando se logró por primera vez). */
function mejor(series: SerieMuro[], valor: (s: SerieMuro) => number, fechaDe: (s: SerieMuro) => string, menor = false): { valor: number; fecha: string } | null {
  let elegido: { valor: number; fecha: string } | null = null
  for (const s of series) {
    const v = valor(s)
    if (!(v > 0) && !(menor && v === 0)) continue
    const f = fechaDe(s)
    if (!elegido || (menor ? v < elegido.valor : v > elegido.valor) || (v === elegido.valor && f < elegido.fecha)) elegido = { valor: v, fecha: f }
  }
  return elegido
}

/**
 * La marca principal sesión a sesión (las últimas `SESIONES_EVOLUCION`) y cuánto ha mejorado la vigente desde la primera
 * de ellas: más peso, más lastre o más repeticiones; en asistencia, menos peso de ayuda.
 */
function evolucionDe(series: SerieMuro[], principal: Marca, inicio: (s: SerieMuro) => number): Pick<MuroEjercicio, 'evolucion' | 'mejora'> {
  const menor = principal.tipo === 'asistencia'
  const valor = (s: SerieMuro) => (principal.tipo === 'reps' ? s.reps : s.peso)
  const porSesion = new Map<number, { inicio: number; valor: number }>()
  for (const s of series) {
    const v = valor(s)
    if (!(v > 0) && !(menor && v === 0)) continue
    const previa = porSesion.get(s.workoutId)
    if (!previa || (menor ? v < previa.valor : v > previa.valor)) porSesion.set(s.workoutId, { inicio: inicio(s), valor: v })
  }
  const evolucion = [...porSesion.values()].sort((a, b) => a.inicio - b.inicio).slice(-SESIONES_EVOLUCION).map((x) => x.valor)
  const diferencia = evolucion.length < 2 ? 0 : Math.round((menor ? evolucion[0] - principal.valor : principal.valor - evolucion[0]) * 100) / 100
  return { evolucion, mejora: diferencia > 0 ? diferencia : null }
}

/**
 * Mejores marcas de cada ejercicio y variante en los entrenos terminados: peso máximo (kg externos o lastre),
 * 1RM estimado (bilateral con carga externa, sin tempo), repeticiones con el peso corporal y la menor asistencia.
 * De la marca más reciente a la más antigua.
 */
export function muroRecords(workouts: readonly Pick<Workout, 'id' | 'inicio' | 'fin'>[], sets: readonly SetEntry[], gimnasios?: ReadonlyMap<number, string>): MuroEjercicio[] {
  const fechaDe = new Map(workouts.filter((w) => w.fin !== undefined).map((w) => [w.id, toISODate(new Date(w.inicio))]))
  const inicioDe = new Map(workouts.map((w) => [w.id, w.inicio]))
  const grupos = acumularComparables(new Map(), sets.filter((s) => fechaDe.has(s.workoutId)))
  const fecha = (s: SerieMuro) => fechaDe.get(s.workoutId) ?? ''
  const muro: MuroEjercicio[] = []
  for (const series of grupos.values()) {
    const ss = series as SerieMuro[]
    const primera = ss[0]
    const modo = modoCarga(primera)
    const marcas: Marca[] = []
    const add = (tipo: TipoMarca, m: { valor: number; fecha: string } | null) => { if (m) marcas.push({ tipo, ...m }) }
    if (modo === 'externa' || modo === 'lastre') add('peso', mejor(ss, (s) => s.peso, fecha))
    if (modo === 'externa' && !primera.ejecucion && !primera.excentricaSeg) add('1rm', mejor(ss, (s) => epley1RM(s.peso, s.reps), fecha))
    if (modo === 'corporal') add('reps', mejor(ss, (s) => s.reps, fecha))
    if (modo === 'asistencia') add('asistencia', mejor(ss, (s) => s.peso, fecha, true))
    if (!marcas.length) continue
    const variante = contextoSerie(primera, gimnasios)
    muro.push({ exerciseId: primera.exerciseId, modo, ...(variante ? { variante } : {}), marcas, ultima: marcas.reduce((a, m) => (m.fecha > a ? m.fecha : a), ''),
      ...evolucionDe(ss, marcas[0], (s) => inicioDe.get(s.workoutId) ?? 0) })
  }
  return muro.sort((a, b) => b.ultima.localeCompare(a.ultima) || a.exerciseId - b.exerciseId)
}

/** «Peso máximo · 100 kg», «1RM estimado · 120 kg», «Lastre máximo · +10 kg», «Repeticiones · 15», «Menor asistencia · 20 kg». */
export function describirMarca(m: Marca, modo: ModoCarga): { nombre: string; valor: string; fecha: string } {
  const kg = (n: number) => `${formatNumber(n, 2)} kg`
  const fecha = formatFriendly(m.fecha)
  if (m.tipo === 'peso') return modo === 'lastre' ? { nombre: 'Lastre máximo', valor: `+${kg(m.valor)}`, fecha } : { nombre: 'Peso máximo', valor: kg(m.valor), fecha }
  if (m.tipo === '1rm') return { nombre: '1RM estimado', valor: kg(m.valor), fecha }
  if (m.tipo === 'reps') return { nombre: 'Repeticiones', valor: formatNumber(m.valor), fecha }
  return { nombre: 'Menor asistencia', valor: kg(m.valor), fecha }
}

/**
 * Trazo de la minigráfica de un récord en un lienzo de `ancho` × `alto`: un punto por sesión, repartidos a lo ancho, e y
 * ceñida a su mínimo y máximo. Con `invertir` (asistencia), arriba es menos, para que subir sea siempre mejorar.
 * Con menos de dos sesiones no hay gráfica.
 */
export function trazadoEvolucion(valores: readonly number[], { ancho = 64, alto = 28, margen = 3, invertir = false } = {}): { d: string; ultimo: { x: number; y: number } } | null {
  if (valores.length < 2) return null
  const [min, max] = [Math.min(...valores), Math.max(...valores)]
  const x = (i: number) => margen + (i / (valores.length - 1)) * (ancho - 2 * margen)
  const y = (v: number) => (max === min ? alto / 2 : margen + ((invertir ? v - min : max - v) / (max - min)) * (alto - 2 * margen))
  const xy = valores.map((v, i) => [Math.round(x(i) * 10) / 10, Math.round(y(v) * 10) / 10] as const)
  return { d: xy.map(([px, py], i) => `${i ? 'L' : 'M'}${px} ${py}`).join(''), ultimo: { x: xy[xy.length - 1][0], y: xy[xy.length - 1][1] } }
}
