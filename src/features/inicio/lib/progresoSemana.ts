import { formatInt } from '../../../shared/lib/format'
import { formatKm } from '../../actividades/lib/actividad'
import type { SemanaRitmo } from '../../ritmo/lib/ritmo'

const plural = (n: number, uno: string, varios: string) => `${formatInt(n)} ${n === 1 ? uno : varios}`

/** «+620 m esta semana» (Cumbres); «0 m esta semana» si aún no ha subido nada. */
export function textoMetrosSemana(metros: number): string {
  return `${metros > 0 ? '+' : ''}${formatInt(Math.round(metros))}\u00a0m esta semana`
}

/** «+12,4 km esta semana» (Caminos), con los metros recorridos. */
export function textoKmSemana(metros: number): string {
  return `${metros > 0 ? '+' : ''}${formatKm(metros)}\u00a0km esta semana`
}

/**
 * La semana en curso de Ritmo en una línea corta para su tesela: «2 de 3 entrenos · falta 1», «Semana cumplida» o
 * «En pausa». Con un plan sin entrenos, los días registrados. Sin juicio: lo que falta, no un aviso.
 */
export function textoRitmoSemana(s: Pick<SemanaRitmo, 'cumplida' | 'pausa' | 'entrenos' | 'diasRegistrados' | 'plan'>): string {
  if (s.cumplida) return 'Semana cumplida'
  if (s.pausa) return 'En pausa'
  if (s.plan.entrenos === 0 && s.diasRegistrados !== null) {
    const faltan = s.plan.diasRegistro - s.diasRegistrados
    return `${formatInt(s.diasRegistrados)} de ${plural(s.plan.diasRegistro, 'día', 'días')}${faltan > 0 ? ` · faltan\u00a0${formatInt(faltan)}` : ''}`
  }
  const faltan = s.plan.entrenos - s.entrenos
  return `${formatInt(s.entrenos)} de ${plural(s.plan.entrenos, 'entreno', 'entrenos')}${faltan > 0 ? ` · ${faltan === 1 ? 'falta' : 'faltan'}\u00a0${formatInt(faltan)}` : ''}`
}

/** «2 nuevas esta semana», «1 nueva esta semana» o «Ninguna nueva esta semana» (Vitrina). */
export function textoPiezasSemana(n: number): string {
  return n === 0 ? 'Ninguna nueva esta semana' : `${formatInt(n)} ${n === 1 ? 'nueva' : 'nuevas'} esta semana`
}
