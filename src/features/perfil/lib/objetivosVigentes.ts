import type { Objetivos } from '../../../shared/db/types'
import { reajustarObjetivos } from '../../nutricion/lib/objetivos'
import type { ResultadoEnergia } from './energia'

export type OrigenObjetivos = 'perfil' | 'manual'
export type ObjetivosVigentes = Objetivos & { origen: OrigenObjetivos }

/**
 * Objetivos que usa toda la app. Con perfil completo y objetivo elegido, las kcal salen del perfil y los macros
 * se reescalan conservando el reparto en % de los manuales; si no, mandan los manuales. Nada se guarda.
 */
export function objetivosVigentes(manuales: Objetivos, energia: ResultadoEnergia | null): ObjetivosVigentes {
  if (energia?.estado === 'ok' && energia.objetivoKcal !== null) {
    return { ...reajustarObjetivos(manuales, 'kcal', energia.objetivoKcal), origen: 'perfil' }
  }
  return { ...manuales, origen: 'manual' }
}
