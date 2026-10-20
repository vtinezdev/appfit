import type { SetEntry } from '../../../shared/db/types'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { modoCarga } from './carga'
import { describirReps, type SerieEjecucion } from './ejecucion'
import type { RecordEjercicio } from './records'
import { efectivas, volumenSets } from './workout'

/**
 * Presentación de la ficha de un entreno terminado (detalle del historial y fin de sesión): récords agrupados por
 * ejercicio en cifras sueltas y cada serie como una pastilla «80 kg × 8».
 */

const kg = (n: number) => formatNumber(n, 2)
const plural = (n: number, uno: string, varios: string) => `${formatInt(n)} ${n === 1 ? uno : varios}`

/** Récords agrupados por ejercicio, en el orden en que aparecen. */
export function recordsPorEjercicio(records: RecordEjercicio[]): { exerciseId: number; records: RecordEjercicio[] }[] {
  const grupos = new Map<number, RecordEjercicio[]>()
  for (const r of records) grupos.set(r.exerciseId, [...(grupos.get(r.exerciseId) ?? []), r])
  return [...grupos].map(([exerciseId, rs]) => ({ exerciseId, records: rs }))
}

/** Ids de las series que marcan algún récord. */
export function seriesConRecord(records: RecordEjercicio[]): Set<number> {
  return new Set(records.flatMap(r => (r.setId !== undefined ? [r.setId] : [])))
}

export interface PartesRecord {
  /** Qué se ha batido: «Peso máximo», «Reps con 60 kg»… */
  rotulo: string
  /** La cifra nueva: «82,5 kg», «10 reps». */
  valor: string
  /** Cuánto mejora a la anterior: «+2,5 kg», «+1 rep», «−5 kg» de asistencia. */
  mejora: string
  variante?: string
}

/** Un récord en tres piezas (rótulo, cifra y mejora) para mostrarlo como cifra en lugar de frase. */
export function partesRecord(r: RecordEjercicio): PartesRecord {
  const diferencia = Math.abs(r.valor - r.anterior)
  const variante = r.variante ? { variante: r.variante } : {}
  if (r.tipo === 'asistencia') return { rotulo: 'Menos asistencia', valor: `${kg(r.valor)} kg`, mejora: `−${kg(diferencia)} kg`, ...variante }
  if (r.tipo === 'reps') {
    const peso = r.peso ?? 0
    const rotulo = r.modoCarga === 'corporal' ? 'Reps con peso corporal'
      : r.modoCarga === 'lastre' ? `Reps con +${kg(peso)} kg`
        : r.modoCarga === 'asistencia' ? `Reps con ${kg(peso)} kg de asistencia`
          : `Reps con ${kg(peso)} kg`
    return { rotulo, valor: plural(r.valor, 'rep', 'reps'), mejora: `+${plural(diferencia, 'rep', 'reps')}`, ...variante }
  }
  if (r.tipo === '1rm') return { rotulo: '1RM estimado', valor: `${kg(r.valor)} kg`, mejora: `+${kg(diferencia)} kg`, ...variante }
  if (r.modoCarga === 'lastre') return { rotulo: 'Lastre máximo', valor: `+${kg(r.valor)} kg`, mejora: `+${kg(diferencia)} kg`, ...variante }
  return { rotulo: 'Peso máximo', valor: `${kg(r.valor)} kg`, mejora: `+${kg(diferencia)} kg`, ...variante }
}

/** Carga en pocas palabras para una pastilla; el detalle completo (masa corporal de ese día) va en la tabla. */
function cargaCorta(s: SerieEjecucion): string {
  const modo = modoCarga(s)
  if (modo === 'corporal') return 'Corporal'
  if (modo === 'lastre') return `+${kg(s.peso)} kg`
  if (modo === 'asistencia') return `Asistencia ${kg(s.peso)} kg`
  return `${kg(s.peso)} kg`
}

export interface PastillaSerie {
  id: number
  /** «80 kg × 8»; por lados, «I 30 kg × 10 · D 30 kg × 9». */
  texto: string
  calentamiento: boolean
  /** Marcada como no hecha al terminar (`realizada: false`). Sin confirmar (datos antiguos) no cuenta como pendiente. */
  pendiente: boolean
  bajadas: number
}

export function pastillaSerie(s: SerieEjecucion & Pick<SetEntry, 'id'>): PastillaSerie {
  const texto = s.ejecucion === 'lados'
    ? (['izquierda', 'derecha'] as const).flatMap(l => {
      const p = s.lados?.[l]
      return p ? [`${l === 'izquierda' ? 'I' : 'D'} ${cargaCorta({ ...s, ...p })} × ${formatNumber(p.reps)}`] : []
    }).join(' · ') || 'Sin registrar'
    : `${cargaCorta(s)} × ${describirReps(s)}`
  return { id: s.id, texto, calentamiento: s.tipo === 'calentamiento', pendiente: s.realizada === false, bajadas: s.bajadas?.length ?? 0 }
}

/** «3 series · 1.858 kg»; con pendientes, «3 de 4 series»; sin volumen (peso corporal), solo las series. */
export function resumenEjercicio(series: SerieEjecucion[]): string {
  const total = series.filter(s => s.tipo !== 'calentamiento').length
  if (!total) return series.length ? 'Solo calentamiento' : 'Sin series'
  const hechas = efectivas(series).length
  const volumen = volumenSets(series)
  return [hechas === total ? plural(total, 'serie', 'series') : `${formatInt(hechas)} de ${plural(total, 'serie', 'series')}`,
    volumen > 0 ? `${formatInt(volumen)} kg` : ''].filter(Boolean).join(' · ')
}
