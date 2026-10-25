/** Una persona tal como la ve quien usa la app, y qué puede hacer con ella. */

/** Un sentido del seguimiento: sin relación, solicitud pendiente o aceptada. */
export type EstadoSeguimiento = 'no' | 'pendiente' | 'aceptado'

export interface Persona {
  alias: string
  nombre: string | null
  /** Si yo la sigo. */
  sigo: EstadoSeguimiento
  /** Si ella me sigue. */
  meSigue: EstadoSeguimiento
}

/** El nombre si lo tiene; si no, el alias con su «@». */
export function nombreVisible(p: Pick<Persona, 'alias' | 'nombre'>): string {
  return p.nombre ?? `@${p.alias}`
}

/** «Os seguís», «Te sigue», «Solicitud enviada»…, o `null` sin relación. */
export function textoRelacion(p: Persona): string | null {
  const partes: string[] = []
  if (p.sigo === 'aceptado' && p.meSigue === 'aceptado') partes.push('Os seguís')
  else if (p.sigo === 'aceptado') partes.push('Siguiendo')
  else if (p.meSigue === 'aceptado') partes.push('Te sigue')
  if (p.sigo === 'pendiente') partes.push('Solicitud enviada')
  if (p.meSigue === 'pendiente') partes.push('Quiere seguirte')
  return partes.length > 0 ? partes.join(' · ') : null
}

export type AccionSeguir = 'seguir' | 'cancelar' | 'dejar'

/** La acción de seguir que toca: pedirlo, cancelar la solicitud o dejar de seguir. */
export function accionSeguir(p: Persona): AccionSeguir {
  if (p.sigo === 'pendiente') return 'cancelar'
  return p.sigo === 'aceptado' ? 'dejar' : 'seguir'
}

export const TEXTO_ACCION: Record<AccionSeguir, string> = {
  seguir: 'Pedir seguir',
  cancelar: 'Cancelar solicitud',
  dejar: 'Dejar de seguir',
}
