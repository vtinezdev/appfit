// Gratis y de pago (ADR 068). Entreno, Actividades, Liga, Social y la cuenta son gratis siempre; Nutrición, Perfil y la copia
// en la nube, durante un mes de prueba desde la primera apertura y después con un pago único. Funciones puras: el entorno
// (si el cobro se aplica aquí y si se ha desbloqueado) lo pone `shared/pwa/cobro.ts`.
import type { Settings } from '../db/types'
import { addDays, diasEntre } from './dates'

/** Días de la prueba, contando el de la primera apertura. */
export const DIAS_PRUEBA = 30

/** Lo que cuesta desbloquear; hasta que lo dé Play Billing (parte 3 del ADR 068), el texto fijo. */
export const PRECIO_DESBLOQUEO = '9,99 €'

export type Acceso =
  /** El cobro no se aplica aquí (la web, el iPhone o mientras está apagado): todo abierto. */
  | { tipo: 'abierto' }
  | { tipo: 'desbloqueado' }
  /** `quedan` cuenta hoy: el último día de prueba, 1. */
  | { tipo: 'prueba'; quedan: number; ultimoDia: string }
  | { tipo: 'terminada'; ultimoDia: string }

export interface EntornoAcceso {
  /** Si el bloqueo se aplica en esta sesión (la app de Google Play con el cobro encendido). */
  aplica: boolean
  /** Si esta persona ya lo tiene desbloqueado (comprado o desbloqueado a mano). */
  desbloqueado: boolean
}

/** Sin primera apertura apuntada (un backup recién importado), la prueba empieza hoy. */
export function calcularAcceso(s: Pick<Settings, 'primeraApertura'> | undefined, entorno: EntornoAcceso, hoy: string): Acceso {
  if (!entorno.aplica) return { tipo: 'abierto' }
  if (entorno.desbloqueado) return { tipo: 'desbloqueado' }
  const ultimoDia = addDays(s?.primeraApertura || hoy, DIAS_PRUEBA - 1)
  if (hoy > ultimoDia) return { tipo: 'terminada', ultimoDia }
  // Una primera apertura en el futuro (reloj cambiado) no da más de un mes.
  return { tipo: 'prueba', quedan: Math.min(DIAS_PRUEBA, diasEntre(hoy, ultimoDia) + 1), ultimoDia }
}

/** Con la prueba terminada sin desbloquear, lo de pago queda en solo lectura. */
export const dePagoBloqueado = (a: Acceso): boolean => a.tipo === 'terminada'

/** Resumen corto para Ajustes; `null` cuando no hay nada que contar (todo abierto). */
export function resumenAcceso(a: Acceso): string | null {
  if (a.tipo === 'abierto') return null
  if (a.tipo === 'desbloqueado') return 'Desbloqueada'
  if (a.tipo === 'terminada') return 'Prueba terminada'
  return a.quedan === 1 ? 'Prueba: último día' : `Prueba: quedan ${a.quedan} días`
}
