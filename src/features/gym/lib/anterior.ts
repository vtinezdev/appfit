import type { Lado, SetEntry, Workout } from '../../../shared/db/types'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { diasEntre, toISODate } from '../../../shared/lib/dates'
import { DIAS_VUELTA_AL_RUEDO } from '../../vitrina/lib/logros'
import { modoCarga } from './carga'

/** Lo que se hizo en la serie equivalente de la sesión anterior: corto para la columna y completo para el lector de pantalla. */
export interface TextoAnterior { texto: string; etiqueta: string }
interface TramoAnterior { fila?: TextoAnterior; lados: Partial<Record<Lado, TextoAnterior>> }
export interface Anterior extends TramoAnterior { bajadas: TramoAnterior[] }

type SerieCarga = Pick<SetEntry, 'modoCarga'>

/** «8 × 72,5» (kg), «8 × +10» (lastre), «8 × −20» (ayuda) o «12 reps» (corporal). Sin reps no hay dato. */
export function textoAnterior(s: SerieCarga, reps: number, peso: number): TextoAnterior | undefined {
  if (!Number.isFinite(reps) || reps <= 0) return undefined
  const r = formatInt(reps), kg = formatNumber(Math.max(0, peso || 0), 2), modo = modoCarga(s)
  const veces = `${r} ${reps === 1 ? 'repetición' : 'repeticiones'}`
  if (modo === 'corporal') return { texto: `${r} reps`, etiqueta: `${veces} con peso corporal` }
  if (modo === 'lastre') return { texto: `${r} × +${kg}`, etiqueta: `${veces} con ${kg} kg de lastre` }
  if (modo === 'asistencia') return { texto: `${r} × −${kg}`, etiqueta: `${veces} con ${kg} kg de ayuda` }
  return { texto: `${r} × ${kg}`, etiqueta: `${veces} con ${kg} kg` }
}

function tramo(s: SetEntry, t: Pick<SetEntry, 'reps' | 'peso' | 'lados'>): TramoAnterior {
  const lados: TramoAnterior['lados'] = {}
  for (const lado of ['izquierda', 'derecha'] as const) {
    const p = t.lados?.[lado]
    const texto = p && textoAnterior(s, p.reps, p.peso)
    if (texto) lados[lado] = texto
  }
  return { fila: s.ejecucion === 'lados' ? undefined : textoAnterior(s, t.reps, t.peso), lados }
}

/**
 * Empareja cada serie actual con la del mismo orden en la sesión anterior: los calentamientos entre sí y las efectivas entre sí
 * (la 2.ª efectiva con la 2.ª efectiva). Cada lado y cada bajada se comparan con su par. Las series anteriores no realizadas no cuentan.
 */
export function anterioresPorSerie(actuales: SetEntry[], previas: SetEntry[]): Map<number, Anterior> {
  const ordenar = (sets: SetEntry[]) => [...sets].sort((a, b) => a.orden - b.orden || a.createdAt - b.createdAt)
  const realizadas = ordenar(previas).filter(s => s.realizada !== false)
  const grupos = { calentamiento: realizadas.filter(s => s.tipo === 'calentamiento'), efectiva: realizadas.filter(s => s.tipo !== 'calentamiento') }
  const vistos = { calentamiento: 0, efectiva: 0 }
  const resultado = new Map<number, Anterior>()
  for (const s of ordenar(actuales)) {
    const grupo = s.tipo === 'calentamiento' ? 'calentamiento' : 'efectiva'
    const previa = grupos[grupo][vistos[grupo]++]
    if (previa) resultado.set(s.id, { ...tramo(previa, previa), bajadas: (previa.bajadas ?? []).map(b => tramo(previa, b)) })
  }
  return resultado
}

/**
 * Series del ejercicio en la última sesión terminada que empezó antes que `actual` (sirve para la sesión activa y para editar
 * una pasada). Solo las del gimnasio indicado (`gimnasioDeSerie`; sin él, el habitual): una máquina de otro gimnasio no es referencia.
 */
export function seriesSesionAnterior(todas: SetEntry[], exerciseId: number, actual: Pick<Workout, 'id' | 'inicio'>, workouts: Pick<Workout, 'id' | 'inicio' | 'fin'>[], gimnasioId?: number): SetEntry[] {
  const delEjercicio = todas.filter(s => s.exerciseId === exerciseId && s.gimnasioId === gimnasioId)
  const conEjercicio = new Set(delEjercicio.map(s => s.workoutId))
  let previo: Pick<Workout, 'id' | 'inicio'> | undefined
  for (const w of workouts) {
    if (w.id === actual.id || w.fin === undefined || w.inicio >= actual.inicio || !conEjercicio.has(w.id)) continue
    if (!previo || w.inicio > previo.inicio) previo = w
  }
  return previo ? delEjercicio.filter(s => s.workoutId === previo.id) : []
}

/**
 * Días naturales desde la última sesión terminada con el ejercicio (en cualquier gimnasio: una pausa lo es aunque cambie
 * la máquina) hasta la de `actual`, o `null` si no hay ninguna anterior. Sirve para avisar tras un parón (GAM-07).
 */
export function diasDesdeUltimaSesion(todas: SetEntry[], exerciseId: number, actual: Pick<Workout, 'id' | 'inicio'>, workouts: Pick<Workout, 'id' | 'inicio' | 'fin'>[]): number | null {
  const conEjercicio = new Set(todas.filter(s => s.exerciseId === exerciseId).map(s => s.workoutId))
  let ultimo: number | undefined
  for (const w of workouts) {
    if (w.id === actual.id || w.fin === undefined || w.inicio >= actual.inicio || !conEjercicio.has(w.id)) continue
    if (ultimo === undefined || w.inicio > ultimo) ultimo = w.inicio
  }
  return ultimo === undefined ? null : diasEntre(toISODate(new Date(ultimo)), toISODate(new Date(actual.inicio)))
}

/** Si toca avisar: la misma pausa que el logro «Vuelta al ruedo» (días sin hacerlo entre una sesión y otra). */
export const trasParon = (dias: number | null): dias is number => dias !== null && dias - 1 >= DIAS_VUELTA_AL_RUEDO
