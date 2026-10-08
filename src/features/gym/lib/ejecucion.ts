import type { Agarre, ConfiguracionEjecucion, DatosLado, Exercise, SetEntry, TramoDropset } from '../../../shared/db/types'
import { modoCarga, formatearCarga } from './carga'
import { catalogoDeLocal } from './selectorEjercicios'
import { formatNumber } from '../../../shared/lib/format'

export type SerieEjecucion = Pick<SetEntry, 'reps' | 'peso'> & Partial<Pick<SetEntry, 'ejecucion' | 'kgUnilateral' | 'agarre' | 'lados' | 'soloNegativas' | 'excentricaSeg' | 'bajadas' | 'realizada' | 'tipo' | 'modoCarga' | 'pesoCorporal' | 'rir'>>
export const EJECUCIONES = { bilateral: 'Bilateral', unilateral: 'Unilateral · ambos iguales', lados: 'Unilateral · distinguir lados' } as const
export const ORIENTACIONES = { prono: 'Prono', supino: 'Supino', neutro: 'Neutro' } as const
export const ANCHURAS = { estrecho: 'Estrecho', medio: 'Medio', ancho: 'Ancho' } as const
export const ACCESORIOS = { barra: 'Barra', cuerda: 'Cuerda', individual: 'Agarre individual', maquina: 'Agarre de máquina' } as const
const positivo = (n: number) => Number.isFinite(n) && n > 0 ? n : 0

/** Editorial: no cambiar músculos ni inferir agarres a partir del historial. */
export function opcionesAgarre(e: Exercise) {
  const c = catalogoDeLocal(e), id = c?.id ?? '', equipo = c?.equipment ?? e.equipment ?? []
  const tiron = /dominadas|jalon|remo|curl/.test(id)
  const fijoNeutro = /jalon-neutro|curl-martillo/.test(id)
  const accesorioFijo = /extension-triceps-cuerda|extension-triceps-barra/.test(id)
  return { orientacion: !fijoNeutro && (tiron || !c), anchura: /dominadas|jalon|remo/.test(id) || !c,
    accesorio: !accesorioFijo && (equipo.includes('polea') || !c) }
}
export function textoAgarre(a?: Agarre): string {
  return [a?.orientacion && ORIENTACIONES[a.orientacion], a?.anchura && ANCHURAS[a.anchura], a?.accesorio && ACCESORIOS[a.accesorio]].filter(Boolean).join(' · ')
}
export function contextoSerie(s: Partial<SerieEjecucion>): string {
  const partes = [s.ejecucion === 'unilateral' ? `Ambos lados · kg ${s.kgUnilateral === 'total' ? 'totales' : 'por lado'}` : s.ejecucion === 'lados' ? `Lados separados · ${s.lados?.izquierda && s.lados?.derecha ? 'ambos registrados' : s.lados?.izquierda ? 'izquierda' : s.lados?.derecha ? 'derecha' : 'sin lados registrados'} · kg por lado` : '', textoAgarre(s.agarre), s.soloNegativas ? 'Solo negativas' : '', s.excentricaSeg ? `Descenso ${formatNumber(s.excentricaSeg)} s` : '', s.bajadas?.length ? `Dropset · ${s.bajadas.length + 1} tramos` : '']
  return partes.filter(Boolean).join(' · ')
}
/** Independiente del orden de propiedades; sin snapshot corporal ni reps/peso. */
export function claveComparacion(s: Partial<SerieEjecucion>): string {
  return JSON.stringify([modoCarga(s), s.ejecucion ?? 'bilateral', s.ejecucion === 'unilateral' ? s.kgUnilateral ?? 'lado' : 'lado', s.agarre?.orientacion ?? '', s.agarre?.anchura ?? '', s.agarre?.accesorio ?? '', !!s.soloNegativas, s.excentricaSeg ?? 0, s.ejecucion === 'lados' ? Object.keys(s.lados ?? {}).sort().join(',') : ''])
}
export function convencional(s: Partial<SerieEjecucion>): boolean { return !s.soloNegativas && !s.bajadas?.length }
/** Datos de cada lado realmente indicado. Total en ambos iguales se reparte una sola vez. */
export function partesTramo(s: SerieEjecucion, tramo: Pick<TramoDropset, 'reps' | 'peso' | 'lados'> = s): DatosLado[] {
  if (s.ejecucion === 'lados') return [tramo.lados?.izquierda, tramo.lados?.derecha].filter((p): p is DatosLado => !!p).map(p => ({ ...p, reps: positivo(p.reps), peso: positivo(p.peso) }))
  const p = { reps: positivo(tramo.reps), peso: positivo(tramo.peso) }
  if (s.ejecucion === 'unilateral') { const peso = s.kgUnilateral === 'total' ? p.peso / 2 : p.peso; return [{ ...p, peso }, { ...p, peso }] }
  return [p]
}
export function tramosSerie(s: SerieEjecucion) { return [s, ...(s.bajadas ?? [])].map(t => partesTramo(s, t)) }
export function repsComparables(s: SerieEjecucion): number { const ps = partesTramo(s); return ps.length ? Math.min(...ps.map(p => p.reps)) : 0 }
export function pesoComparable(s: SerieEjecucion): number { const ps = partesTramo(s); return ps.length ? Math.min(...ps.map(p => p.peso)) : 0 }
export function tieneReps(s: SerieEjecucion): boolean { return tramosSerie(s).some(ps => ps.some(p => p.reps > 0)) }
/** Volumen físico registrado, sin cuerpo/ayuda; todos los tramos suman exactamente una vez. */
export function volumenSerie(s: SerieEjecucion): number {
  if (modoCarga(s) !== 'externa' && modoCarga(s) !== 'lastre') return 0
  return Math.min(Number.MAX_VALUE, tramosSerie(s).reduce((total, ps) => total + ps.reduce((v, p) => v + p.peso * p.reps, 0), 0))
}
/** Una serie bilateral o ambos lados cuenta una vez. Lados distintos: promedio de los dos lados, ausente = cero. */
export function repsEstimulo(s: SerieEjecucion): number {
  const denominador = s.ejecucion === 'bilateral' || !s.ejecucion ? 1 : 2
  // La dropset es una serie extendida: techo único de 30 reps, no una serie nueva por bajada.
  return Math.min(30, tramosSerie(s).reduce((n, ps) => n + ps.reduce((r, p) => r + p.reps, 0) / denominador, 0))
}
export function describirReps(s: SerieEjecucion): string {
  if (s.ejecucion === 'lados') return ['izquierda', 'derecha'].map(l => { const p = s.lados?.[l as 'izquierda' | 'derecha']; return `${l === 'izquierda' ? 'I' : 'D'}: ${p ? `${formatNumber(p.reps)} reps · ${formatearCarga({ ...s, ...p })}` : 'sin registrar'}` }).join(' · ')
  return `${formatNumber(s.reps)}${s.ejecucion === 'unilateral' ? ' por lado' : ''}`
}
export function validarEjecucion(c: ConfiguracionEjecucion): void {
  if (!Object.hasOwn(EJECUCIONES, c.ejecucion) || (c.kgUnilateral && !['lado', 'total'].includes(c.kgUnilateral))) throw new Error('Selecciona una ejecución válida.')
  for (const [valor, opciones] of [[c.agarre?.orientacion, ORIENTACIONES], [c.agarre?.anchura, ANCHURAS], [c.agarre?.accesorio, ACCESORIOS]] as const) if (valor && !Object.hasOwn(opciones, valor)) throw new Error('Selecciona un agarre válido.')
}
export function aplicarEjecucion(s: SerieEjecucion, c: ConfiguracionEjecucion) {
  const distinto = (s.ejecucion ?? 'bilateral') !== c.ejecucion || (s.kgUnilateral ?? 'lado') !== (c.kgUnilateral ?? 'lado')
  return { ejecucion: c.ejecucion === 'bilateral' ? undefined : c.ejecucion, kgUnilateral: c.ejecucion === 'unilateral' ? c.kgUnilateral ?? 'lado' : undefined, agarre: c.agarre,
    ...(distinto ? { reps: 0, peso: 0, lados: undefined, bajadas: undefined } : {}) }
}
export function validarSerie(s: SerieEjecucion) {
  validarEjecucion({ ejecucion: s.ejecucion ?? 'bilateral', kgUnilateral: s.kgUnilateral, agarre: s.agarre })
  const valido = (p: DatosLado) => Number.isFinite(p.reps) && p.reps >= 0 && p.reps <= 10000 && Number.isFinite(p.peso) && p.peso >= 0 && p.peso <= 100000 && (p.rir === undefined || Number.isInteger(p.rir) && p.rir >= 0 && p.rir <= 5)
  if (!valido(s) || s.excentricaSeg !== undefined && (!Number.isFinite(s.excentricaSeg) || s.excentricaSeg <= 0 || s.excentricaSeg > 120)) throw new Error('Revisa repeticiones, kg, RIR y segundos (1–120).')
  if ((s.bajadas?.length ?? 0) > 10 || new Set(s.bajadas?.map(b => b.id)).size !== (s.bajadas?.length ?? 0)) throw new Error('Máximo 10 bajadas, con identificadores distintos.')
  for (const t of [s, ...(s.bajadas ?? [])]) {
    if (!valido(t) || Object.values(t.lados ?? {}).some(p => !valido(p))) throw new Error('Revisa los datos de cada tramo y lado.')
  }
}

/** RIR por lado cambia esfuerzo anotado, no la ejecución física ya confirmada. */
export function cambiaRealizacion(s: SerieEjecucion, patch: Partial<SerieEjecucion>): boolean {
  const fisico = (x: SerieEjecucion) => JSON.stringify([x.reps, x.peso, x.ejecucion ?? 'bilateral', x.kgUnilateral ?? 'lado', x.agarre?.orientacion ?? '', x.agarre?.anchura ?? '', x.agarre?.accesorio ?? '', x.soloNegativas ?? false, x.excentricaSeg, Object.entries(x.lados ?? {}).sort().map(([l, p]) => [l, p.reps, p.peso]), x.bajadas?.map(b => [b.id, b.reps, b.peso, Object.entries(b.lados ?? {}).sort().map(([l, p]) => [l, p.reps, p.peso])]) ?? []])
  return fisico(s) !== fisico({ ...s, ...patch })
}
