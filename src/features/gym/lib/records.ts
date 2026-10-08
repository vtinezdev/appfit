import { claveComparacion, convencional, contextoSerie, repsComparables, pesoComparable, partesTramo, type SerieEjecucion } from './ejecucion'
import type { SetEntry } from '../../../shared/db/types'
import { epley1RM, esEfectiva } from './workout'
import { modoCarga } from './carga'
import type { ModoCarga } from '../../../shared/db/types'

type Serie = SerieEjecucion & Pick<SetEntry, 'exerciseId'>

export type TipoRecord = 'peso' | '1rm' | 'reps' | 'asistencia'

export interface RecordEjercicio {
  exerciseId: number
  tipo: TipoRecord
  /** Peso máximo (kg), 1RM estimado (kg) o repeticiones. */
  valor: number
  /** Valor anterior que se supera. */
  anterior: number
  /** Solo en `reps`: el peso con el que se consiguieron. */
  peso?: number
  modoCarga?: ModoCarga
  variante?: string
}

const validas = (s: Serie) => esEfectiva(s) && convencional(s) && repsComparables(s) > 0 && (s.ejecucion !== 'lados' || partesTramo(s).every(p => p.peso === partesTramo(s)[0].peso)) && (modoCarga(s) === 'externa' ? s.peso > 0 : s.peso >= 0)

/**
 * Récords de una sesión frente a las series de entrenos ANTERIORES. Solo series efectivas con reps y peso positivos.
 * Un ejercicio sin historial previo no genera récords (no hay con qué comparar). Las repeticiones solo se comparan
 * con un peso que ya se había usado antes; los pesos nuevos más altos aparecen como récord de peso.
 */
export function detectarRecords(setsSesion: Serie[], setsAnteriores: Serie[]): RecordEjercicio[] {
  const clave = (s: Serie) => `${s.exerciseId}:${claveComparacion(s)}`
  const previas = new Map<string, Serie[]>()
  for (const s of setsAnteriores.filter(validas).map(s => ({ ...s, reps: repsComparables(s), peso: s.ejecucion === 'unilateral' && s.kgUnilateral === 'total' ? s.peso : pesoComparable(s) }))) previas.set(clave(s), [...(previas.get(clave(s)) ?? []), s])
  const actuales = new Map<string, Serie[]>()
  for (const s of setsSesion.filter(validas).map(s => ({ ...s, reps: repsComparables(s), peso: s.ejecucion === 'unilateral' && s.kgUnilateral === 'total' ? s.peso : pesoComparable(s) }))) actuales.set(clave(s), [...(actuales.get(clave(s)) ?? []), s])

  const records: RecordEjercicio[] = []
  for (const [key, ahora] of actuales) {
    const exerciseId = ahora[0].exerciseId, modo = modoCarga(ahora[0])
    const contexto = { ...(modo === 'externa' ? {} : { modoCarga: modo }), ...(contextoSerie(ahora[0]) ? { variante: contextoSerie(ahora[0]) } : {}) }
    const antes = previas.get(key)
    if (!antes?.length) continue
    const maxPesoAntes = Math.max(...antes.map((s) => s.peso))
    const maxPesoAhora = Math.max(...ahora.map((s) => s.peso))
    if ((modo === 'externa' || modo === 'lastre') && maxPesoAhora > maxPesoAntes) records.push({ exerciseId, tipo: 'peso', valor: maxPesoAhora, anterior: maxPesoAntes, ...contexto })

    if (modo === 'externa' && !ahora[0].ejecucion && !ahora[0].excentricaSeg) {
      const max1rmAntes = Math.max(...antes.map((s) => epley1RM(s.peso, s.reps)))
      const max1rmAhora = Math.max(...ahora.map((s) => epley1RM(s.peso, s.reps)))
      if (max1rmAhora > max1rmAntes) records.push({ exerciseId, tipo: '1rm', valor: max1rmAhora, anterior: max1rmAntes, ...contexto })
    }
    if (modo === 'asistencia') {
      const minima = Math.min(...antes.map(s => s.peso))
      const reps = Math.max(...antes.filter(s => s.peso === minima).map(s => s.reps))
      const comparable = ahora.filter(s => s.reps >= reps)
      const nueva = comparable.length ? Math.min(...comparable.map(s => s.peso)) : minima
      if (nueva < minima) records.push({ exerciseId, tipo: 'asistencia', valor: nueva, anterior: minima, ...contexto })
    }

    const repsAntesPorPeso = new Map<number, number>()
    for (const s of antes) repsAntesPorPeso.set(s.peso, Math.max(repsAntesPorPeso.get(s.peso) ?? 0, s.reps))
    const repsAhoraPorPeso = new Map<number, number>()
    for (const s of ahora) repsAhoraPorPeso.set(s.peso, Math.max(repsAhoraPorPeso.get(s.peso) ?? 0, s.reps))
    for (const [peso, reps] of [...repsAhoraPorPeso].sort((a, b) => b[0] - a[0])) {
      const previo = repsAntesPorPeso.get(peso)
      if (previo !== undefined && reps > previo) records.push({ exerciseId, tipo: 'reps', valor: reps, anterior: previo, peso, ...contexto })
    }
  }
  return records
}

/**
 * Récords de un entreno concreto, comparándolo solo con los entrenos anteriores a él (por `inicio`).
 * `sets` son las series de todos los entrenos.
 */
export function recordsDeEntreno(
  workoutId: number,
  workouts: { id: number; inicio: number }[],
  sets: (Serie & { workoutId: number })[],
): RecordEjercicio[] {
  const w = workouts.find((x) => x.id === workoutId)
  if (!w) return []
  const anteriores = new Set(workouts.filter((x) => x.id !== workoutId && x.inicio < w.inicio).map((x) => x.id))
  return detectarRecords(sets.filter((s) => s.workoutId === workoutId), sets.filter((s) => anteriores.has(s.workoutId)))
}

/** «Peso máximo 105 kg», «1RM estimado 120 kg», «7 reps con 100 kg». */
function textoRecord(r: RecordEjercicio, formato: (n: number) => string): string {
  if (r.tipo === 'asistencia') return `Menos asistencia: ${formato(r.valor)} kg (antes ${formato(r.anterior)})`
  if (r.modoCarga === 'corporal') return `${formato(r.valor)} reps con peso corporal (antes ${formato(r.anterior)})`
  if (r.modoCarga === 'lastre') return r.tipo === 'peso' ? `Lastre máximo: +${formato(r.valor)} kg (antes ${formato(r.anterior)})` : `${formato(r.valor)} reps con +${formato(r.peso ?? 0)} kg de lastre (antes ${formato(r.anterior)})`
  if (r.modoCarga === 'asistencia') return `${formato(r.valor)} reps con ${formato(r.peso ?? 0)} kg de asistencia (antes ${formato(r.anterior)})`
  if (r.tipo === 'peso') return `Peso máximo: ${formato(r.valor)} kg (antes ${formato(r.anterior)})`
  if (r.tipo === '1rm') return `1RM estimado: ${formato(r.valor)} kg (antes ${formato(r.anterior)})`
  return `${formato(r.valor)} reps con ${formato(r.peso ?? 0)} kg (antes ${formato(r.anterior)})`
}

export function describirRecord(r: RecordEjercicio, formato: (n: number) => string): string { return textoRecord(r, formato) + (r.variante ? ` · ${r.variante}` : '') }
