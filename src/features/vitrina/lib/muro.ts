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
}

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
 * Mejores marcas de cada ejercicio y variante en los entrenos terminados: peso máximo (kg externos o lastre),
 * 1RM estimado (bilateral con carga externa, sin tempo), repeticiones con el peso corporal y la menor asistencia.
 * De la marca más reciente a la más antigua.
 */
export function muroRecords(workouts: readonly Pick<Workout, 'id' | 'inicio' | 'fin'>[], sets: readonly SetEntry[]): MuroEjercicio[] {
  const fechaDe = new Map(workouts.filter((w) => w.fin !== undefined).map((w) => [w.id, toISODate(new Date(w.inicio))]))
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
    const variante = contextoSerie(primera)
    muro.push({ exerciseId: primera.exerciseId, modo, ...(variante ? { variante } : {}), marcas, ultima: marcas.reduce((a, m) => (m.fecha > a ? m.fecha : a), '') })
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
