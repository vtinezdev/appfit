import type { SetEntry } from '../../../shared/db/types'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { diasEntre, toISODate } from '../../../shared/lib/dates'
import { modoCarga } from './carga'
import { esEfectiva } from './workout'

/**
 * Orden de la sesión tras sustituir `de` por `nuevo` (ENT-01): el nuevo ocupa el sitio de `de` si este desaparece y, si se
 * queda (con series hechas), va justo detrás. Si `nuevo` ya estaba en la sesión, se mueve allí.
 */
export function ordenTrasSustituir(visibles: readonly number[], de: number, nuevo: number, deSigue: boolean): number[] {
  const sin = visibles.filter(id => id !== nuevo)
  const i = sin.indexOf(de)
  if (i < 0) return [...sin, nuevo]
  return deSigue ? [...sin.slice(0, i + 1), nuevo, ...sin.slice(i + 1)] : [...sin.slice(0, i), nuevo, ...sin.slice(i + 1)]
}

/** «3 × 10 · 32 kg, hace 23 días»: las series efectivas de la última sesión, con las reps más repetidas y el peso mayor. */
export function textoUltimaVez(series: Pick<SetEntry, 'reps' | 'peso' | 'tipo' | 'realizada' | 'modoCarga'>[], inicio: number | undefined, ahora: number): string {
  const efectivas = series.filter(esEfectiva)
  if (!efectivas.length || inicio === undefined) return 'Nunca'
  const cuenta = new Map<number, number>()
  for (const s of efectivas) cuenta.set(s.reps, (cuenta.get(s.reps) ?? 0) + 1)
  const reps = [...cuenta].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0]
  const corporal = efectivas.every(s => modoCarga(s) === 'corporal')
  const peso = Math.max(...efectivas.map(s => s.peso))
  const dias = diasEntre(toISODate(new Date(inicio)), toISODate(new Date(ahora)))
  const cuando = dias <= 0 ? 'hoy' : dias === 1 ? 'ayer' : `hace ${formatInt(dias)} días`
  return `${formatInt(efectivas.length)} × ${formatInt(reps)}${corporal ? '' : ` · ${formatNumber(peso, 2)} kg`}, ${cuando}`
}
