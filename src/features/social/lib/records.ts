import { formatNumber } from '../../../shared/lib/format'
import type { LineaLogro } from './publicacion'

const grupo = (r: LineaLogro) => r.ejercicio
const prioridad = (r: LineaLogro) => r.tipo === 'peso' ? 0 : r.tipo === 'reps' ? 1 : r.tipo === 'asistencia' ? 2 : 3

/** Preferencias de Social: el 1RM se queda en Progreso y solo se comparte reps al mayor peso mejorado. */
export function recordsSocial(records: LineaLogro[]): LineaLogro[] {
  return records.filter(r => r.tipo !== '1rm' && (r.tipo !== 'reps' || !records.some(otro =>
    otro.tipo === 'reps' && otro.variante === r.variante && otro.modo === r.modo && grupo(otro) === grupo(r) && (otro.peso ?? 0) > (r.peso ?? 0))))
}

export function agruparRecords(records: LineaLogro[]): LineaLogro[][] {
  const grupos = new Map<string, LineaLogro[]>()
  for (const r of records) grupos.set(grupo(r), [...(grupos.get(grupo(r)) ?? []), r])
  return [...grupos.values()].map(rs => rs.sort((a, b) => prioridad(a) - prioridad(b) || (b.peso ?? 0) - (a.peso ?? 0)))
}

/** Guarda primero un récord de cada ejercicio: el límite no lo monopoliza el primer ejercicio. */
export function ordenarRecords(records: LineaLogro[]): LineaLogro[] {
  const grupos = agruparRecords(recordsSocial(records))
  return [...grupos.map(rs => rs[0]), ...grupos.flatMap(rs => rs.slice(1))]
}

/**
 * Lo que enseña el mosaico de Ejercicios: solo las subidas de peso (o de lastre, o menos asistencia), por ejercicio.
 * Las de repeticiones y los 1RM se quedan fuera; los récords sin cifras (publicaciones antiguas) también.
 */
export function mejorasDePeso(records: LineaLogro[]): Map<string, { variante?: string; mejora: string }[]> {
  const porEjercicio = new Map<string, { variante?: string; mejora: string }[]>()
  for (const r of records) {
    if ((r.tipo !== 'peso' && r.tipo !== 'asistencia') || r.valor === undefined || r.anterior === undefined) continue
    const { mejora } = formatoRecord(r)
    const linea = { ...(r.variante ? { variante: r.variante } : {}), mejora: r.tipo === 'asistencia' ? `${mejora} de asistencia` : mejora }
    porEjercicio.set(r.ejercicio, [...(porEjercicio.get(r.ejercicio) ?? []), linea])
  }
  return porEjercicio
}

export function formatoRecord(r: LineaLogro): { ahora: string; antes: string; mejora: string } {
  if (!r.tipo || r.valor === undefined || r.anterior === undefined) return { ahora: r.texto, antes: '', mejora: '' }
  const n = (v: number) => formatNumber(v, 2)
  const valor = (v: number) => r.tipo === 'reps'
    ? r.modo === 'corporal' ? `${n(v)} reps` : `${n(v)} × ${r.modo === 'lastre' ? '+' : ''}${n(r.peso ?? 0)} kg${r.modo === 'asistencia' ? ' de asistencia' : ''}`
    : `${r.modo === 'lastre' ? '+' : ''}${n(v)} kg${r.tipo === 'asistencia' ? ' de asistencia' : ''}`
  const delta = r.valor - r.anterior
  return { ahora: valor(r.valor), antes: valor(r.anterior), mejora: `${delta < 0 ? '−' : '+'}${n(Math.abs(delta))} ${r.tipo === 'reps' ? 'reps' : 'kg'}` }
}
