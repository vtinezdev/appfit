// Plan semanal y semana cumplida: la parte de Ritmo que ya usa Atributos (gaming.md). Funciones puras.
import type { PlanSemanal, TipoPausa, TramoPlanSemanal } from '../../../shared/db/types'

export const PLAN_POR_DEFECTO: PlanSemanal = { entrenos: 3, diasRegistro: 5 }
export const OPCIONES_ENTRENOS = [2, 3, 4, 5, 6] as const
export const OPCIONES_DIAS_REGISTRO = [3, 4, 5, 6, 7] as const

const acotar = (n: number, opciones: readonly number[]) => Math.min(opciones[opciones.length - 1], Math.max(opciones[0], Math.round(n)))

/** Valores dentro de los rangos del plan (2–6 entrenos, 3–7 días); lo que venga de un backup editado a mano se acota. */
export function normalizarPlan(plan: PlanSemanal): PlanSemanal {
  return {
    entrenos: Number.isFinite(plan.entrenos) ? acotar(plan.entrenos, OPCIONES_ENTRENOS) : PLAN_POR_DEFECTO.entrenos,
    diasRegistro: Number.isFinite(plan.diasRegistro) ? acotar(plan.diasRegistro, OPCIONES_DIAS_REGISTRO) : PLAN_POR_DEFECTO.diasRegistro,
  }
}

/**
 * El plan que rige la semana que empieza en `lunes`: el último tramo con `desde` ≤ `lunes`. Las semanas anteriores al
 * primer tramo usan el primero (la primera vez que se elige un plan vale para todo el historial). Sin tramos, el de defecto.
 */
export function planDeSemana(tramos: readonly TramoPlanSemanal[] | undefined, lunes: string): PlanSemanal {
  if (!tramos?.length) return PLAN_POR_DEFECTO
  const ordenados = [...tramos].sort((a, b) => a.desde.localeCompare(b.desde))
  let vigente = ordenados[0]
  for (const t of ordenados) if (t.desde <= lunes) vigente = t
  return normalizarPlan(vigente)
}

/**
 * Cambia el plan a partir de la semana de `lunes` (la actual): sustituye el tramo de esa semana o añade uno, y quita los
 * posteriores. Las semanas ya pasadas conservan su plan, así que cambiarlo no reescribe la XP ganada.
 */
export function cambiarPlan(tramos: readonly TramoPlanSemanal[] | undefined, plan: PlanSemanal, lunes: string): TramoPlanSemanal[] {
  const previos = (tramos ?? []).filter((t) => t.desde < lunes)
  return [...previos, { desde: lunes, ...normalizarPlan(plan) }].sort((a, b) => a.desde.localeCompare(b.desde))
}

export interface EstadoSemanaPlan {
  plan: PlanSemanal
  /** Días con un entreno que cuenta (como mucho uno por día). */
  entrenos: number
  /** Días con alguna comida registrada; `null` si la nutrición no cuenta. */
  diasRegistrados: number | null
  cumplida: boolean
  /** Primer día en que se cumplió el plan (los registros atrasados lo pueden adelantar); `null` si no se cumplió. */
  cumplidaEl: string | null
}

/**
 * Estado de una semana frente a su plan: cumplida con entrenos ≥ plan y días registrados ≥ objetivo (si la nutrición
 * cuenta). Solo cuentan los días hasta `hoy`; entrenar o registrar de más no cambia nada. En una pausa de entreno la
 * semana se juzga solo con la nutrición (si no cuenta, como en una semana normal).
 */
export function evaluarSemana(
  fechas: readonly string[],
  diasEntreno: ReadonlySet<string>,
  diasRegistro: ReadonlySet<string> | null,
  plan: PlanSemanal,
  hoy: string,
  pausa: TipoPausa | null = null,
): EstadoSemanaPlan {
  const soloNutricion = pausa === 'entreno' && diasRegistro !== null
  let entrenos = 0
  let registrados = 0
  let cumplidaEl: string | null = null
  for (const f of fechas) {
    if (f > hoy) break
    if (diasEntreno.has(f)) entrenos += 1
    if (diasRegistro?.has(f)) registrados += 1
    const entrenoOk = soloNutricion || entrenos >= plan.entrenos
    if (cumplidaEl === null && entrenoOk && (diasRegistro === null || registrados >= plan.diasRegistro)) cumplidaEl = f
  }
  return { plan, entrenos, diasRegistrados: diasRegistro === null ? null : registrados, cumplida: cumplidaEl !== null, cumplidaEl }
}
