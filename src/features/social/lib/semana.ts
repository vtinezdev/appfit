// Tu semana de Ritmo para compartirla en Social (ADR 056): las tres opciones que se ofrecen, calculadas de Ritmo (solo
// lectura) en el móvil. Lo que sale es solo lo de `resumenSemana`: nada de kcal, peso ni días registrados.
import { addDays } from '../../../shared/lib/dates'
import type { ResultadoRitmo } from '../../ritmo/lib/ritmo'
import type { DatosSemana } from './publicacion'

export interface OpcionesSemana {
  /** La semana con sus cifras; `null` si el plan de Ritmo no tiene entrenos (solo nutrición) o se oculta la gamificación. */
  semana: Extract<DatosSemana, { estado: 'semana' }> | null
  retomando: Extract<DatosSemana, { estado: 'retomando' }>
  pausa: Extract<DatosSemana, { estado: 'pausa' }>
}

/**
 * Las opciones de la semana en curso: los siete días con entreno que cuenta, entrenos frente al plan e hilo. Sin Ritmo
 * (gamificación oculta) solo «Estoy retomando» sin cifras y «En pausa», con el lunes de la semana de `lunesActual`.
 */
export function opcionesSemana(ritmo: Pick<ResultadoRitmo, 'actual' | 'hiloActual'> | null, diasEntreno: ReadonlySet<string>, lunesActual: string): OpcionesSemana {
  if (!ritmo) return { semana: null, retomando: { estado: 'retomando', lunes: lunesActual }, pausa: { estado: 'pausa', lunes: lunesActual } }
  const { lunes, entrenos, plan } = ritmo.actual
  const semana = plan.entrenos > 0
    ? { estado: 'semana' as const, lunes, dias: Array.from({ length: 7 }, (_, i) => diasEntreno.has(addDays(lunes, i))), entrenos, objetivo: plan.entrenos, hilo: ritmo.hiloActual }
    : null
  return { semana, retomando: { estado: 'retomando', lunes, ...(entrenos > 0 ? { entrenos } : {}) }, pausa: { estado: 'pausa', lunes } }
}
