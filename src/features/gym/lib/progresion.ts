import type { PlanProgresion, SetEntry, Workout } from '../../../shared/db/types'
import { claveComparacion, convencional, validarSerie, partesTramo, pesoComparable, repsComparables, type SerieEjecucion } from './ejecucion'
import { modoCarga } from './carga'
import { formatNumber } from '../../../shared/lib/format'

export const SESIONES_PROGRESION = 3
export const TOLERANCIA_MASA_PROGRESION = 0.02
export interface PropuestaProgresion {
  clave: string; tipo: 'reps' | 'peso' | 'asistencia'; texto: string; motivo: string
  sesiones: { id: number; inicio: number }[]
  series: { reps: number; peso: number; lados?: SetEntry['lados'] }[]
}
export function validarPlan(p: PlanProgresion) {
  if (!Number.isInteger(p.series) || p.series < 1 || p.series > 20 || !Number.isInteger(p.repsMin) || !Number.isInteger(p.repsMax) || p.repsMin < 1 || p.repsMax < p.repsMin || p.repsMax > 100 || p.incrementoKg !== undefined && (!Number.isFinite(p.incrementoKg) || p.incrementoKg <= 0 || p.incrementoKg > 100) || p.rirMin !== undefined && (!Number.isInteger(p.rirMin) || p.rirMin < 0 || p.rirMin > 5)) throw new Error('Revisa series (1–20), rango (1–100), incremento y RIR (0–5).')
}
/** Motor local conservador: datos confirmados, misma ejecución/agarre/tempo/carga; nunca una inferencia de seguridad. */
export function recomendarProgresion(exerciseId: number, actual: SerieEjecucion, plan: PlanProgresion | undefined, workouts: Workout[], todas: SetEntry[], antesDe: number): { propuesta?: PropuestaProgresion; estado: string } {
  if (!plan) return { estado: 'Define series y rango para recibir sugerencias.' }
  try { validarPlan(plan) } catch { return { estado: 'Revisa el objetivo de progresión.' } }
  if (!convencional(actual) || actual.excentricaSeg) return { estado: 'Las técnicas especiales y tempos definidos quedan fuera de la doble progresión.' }
  const key = claveComparacion(actual)
  const historico = workouts.filter(w => w.fin !== undefined && w.inicio < antesDe).sort((a, b) => b.inicio - a.inicio || b.id - a.id)
    .map(w => ({ w, ss: todas.filter(s => s.workoutId === w.id && s.exerciseId === exerciseId && s.tipo !== 'calentamiento' && claveComparacion(s) === key).sort((a, b) => a.orden - b.orden) })).filter(g => g.ss.length).slice(0, SESIONES_PROGRESION)
  try { validarSerie(actual); for (const g of historico) for (const s of g.ss) validarSerie(s) } catch { return { estado: 'Revisa los valores de las series antes de recibir una sugerencia.' } }
  if (historico.length < SESIONES_PROGRESION) return { estado: 'Necesitas 3 sesiones terminadas y comparables.' }
  if (historico.some(g => g.ss.length !== plan.series || g.ss.some(s => s.realizada !== true || !convencional(s) || repsComparables(s) < plan.repsMin))) return { estado: 'Confirma todas las series objetivo en las 3 últimas sesiones comparables.' }
  if (plan.rirMin !== undefined && historico.some(g => g.ss.some(s => s.ejecucion === 'lados' ? Object.values(s.lados ?? {}).some(p => p.rir === undefined || p.rir < plan.rirMin!) : s.rir === undefined || s.rir < plan.rirMin!))) return { estado: 'Faltan series que cumplan el RIR objetivo.' }
  const modo = modoCarga(actual), recientes = historico.slice(0, 2)
  // Ningún lado omitido, pesos desiguales o medias combinadas justifican subir ambos lados.
  if (historico.some(g => g.ss.some(s => s.ejecucion === 'lados' && (partesTramo(s).length !== 2 || partesTramo(s).some(p => p.peso !== partesTramo(s)[0].peso))))) return { estado: 'Para progresión conjunta registra ambos lados con la misma carga.' }
  const peso = actual.ejecucion === 'lados' ? pesoComparable(historico[0].ss[0]) : historico[0].ss[0].peso
  if (historico.some(g => g.ss.some(s => (s.ejecucion === 'lados' ? pesoComparable(s) : s.peso) !== peso || pesoComparable(s) !== pesoComparable(historico[0].ss[0])))) return { estado: 'Mantén la misma carga en las sesiones comparadas antes de progresar.' }
  if (modo === 'lastre' || modo === 'asistencia') {
    const masas = [...historico.flatMap(g => g.ss.map(s => s.pesoCorporal)), actual.pesoCorporal]
    if (masas.some(m => !m || !Number.isFinite(m)) || Math.max(...masas as number[]) / Math.min(...masas as number[]) > 1 + TOLERANCIA_MASA_PROGRESION) return { estado: 'Se necesita masa corporal conocida y estable para comparar lastre o asistencia.' }
  }
  const sesiones = historico.map(g => ({ id: g.w.id, inicio: g.w.inicio }))
  const tope = recientes.every(g => g.ss.every(s => repsComparables(s) >= plan.repsMax))
  const series = historico[0].ss.map(s => ({ reps: s.reps, peso: s.peso, ...(s.lados ? { lados: Object.fromEntries(Object.entries(s.lados).map(([lado, p]) => [lado, { reps: p.reps, peso: p.peso }])) } : {}) }))
  const actualizar = (s: typeof series[number], reps: number, kg: number) => ({ reps, peso: kg, ...(s.lados ? { lados: Object.fromEntries(Object.entries(s.lados).map(([lado, p]) => [lado, { ...p, reps, peso: kg }])) } : {}) })
  if (tope && modo !== 'corporal') {
    if (!plan.incrementoKg) return { estado: 'Has alcanzado el rango; define el incremento disponible en tu equipo.' }
    const nueva = modo === 'asistencia' ? peso - plan.incrementoKg : peso + plan.incrementoKg
    if (!Number.isFinite(nueva) || nueva > 100000) return { estado: 'La propuesta supera el límite de registro; revisa el incremento y las cargas.' }
    if (nueva < 0) return { estado: 'El incremento supera la asistencia actual; ajusta el paso de tu equipo.' }
    const tipo = modo === 'asistencia' ? 'asistencia' : 'peso'
    return { estado: 'Sugerencia disponible', propuesta: { clave: JSON.stringify([key, plan, sesiones, tipo, nueva]), tipo,
      texto: modo === 'asistencia' ? `Puedes probar ${formatNumber(nueva, 2)} kg de asistencia` : `Puedes probar ${formatNumber(nueva, 2)} kg${modo === 'lastre' ? ' de lastre' : ''}${actual.ejecucion === 'unilateral' && actual.kgUnilateral !== 'total' || actual.ejecucion === 'lados' ? ' por lado' : ''}`,
      motivo: 'Todas las series llegaron al máximo del rango en las 2 últimas sesiones, con carga comparable.', sesiones, series: series.map(s => actualizar(s, plan.repsMin, nueva)) } }
  }
  const indice = historico[0].ss.findIndex((s, i) => repsComparables(s) < plan.repsMax && historico.slice(1).every(g => repsComparables(g.ss[i]) === repsComparables(s)))
  if (indice < 0) return { estado: modo === 'corporal' && tope ? 'Rango completado; amplía tu objetivo o configura lastre cuando lo decidas.' : 'Mantén la carga y consolida el rango actual.' }
  const reps = repsComparables(historico[0].ss[indice]) + 1
  series[indice] = actualizar(series[indice], reps, series[indice].peso)
  return { estado: 'Sugerencia disponible', propuesta: { clave: JSON.stringify([key, plan, sesiones, 'reps', indice, reps]), tipo: 'reps', texto: `Puedes probar ${reps} reps en la serie ${indice + 1}${actual.ejecucion ? ' por lado' : ''}`,
    motivo: 'Esa serie sostuvo sus repeticiones en las 3 últimas sesiones comparables. Solo se propone una repetición en una serie.', sesiones, series } }
}
