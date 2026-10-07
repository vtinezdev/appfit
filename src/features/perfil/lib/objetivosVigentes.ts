import type { Objetivos } from '../../../shared/db/types'
import { reajustarObjetivos } from '../../nutricion/lib/objetivos'
import type { ResultadoEnergia } from './energia'
import { aplicarProteinaPorKg, type AjusteProteina } from './proteina'

export type OrigenObjetivos = 'perfil' | 'manual'
/** `proteinaPorKg`: presente si la proteína sale de g/kg × peso (entonces es de solo lectura en Ajustes). */
export type ObjetivosVigentes = Objetivos & { origen: OrigenObjetivos; proteinaPorKg?: AjusteProteina }

/**
 * Objetivos que usa toda la app. Con perfil completo y objetivo elegido, las kcal salen del perfil y los macros
 * se reescalan conservando el reparto en % de los manuales; si no, mandan los manuales. Después, si hay proteína
 * por kg aplicable, P sale de ahí. Nada se guarda.
 */
export function objetivosVigentes(manuales: Objetivos, energia: ResultadoEnergia | null, proteina: AjusteProteina | null = null): ObjetivosVigentes {
  const base: ObjetivosVigentes = energia?.estado === 'ok' && energia.objetivoKcal !== null
    ? { ...reajustarObjetivos(manuales, 'kcal', energia.objetivoKcal), origen: 'perfil' }
    : { ...manuales, origen: 'manual' }
  // La proteína por kg (activa por defecto, con peso) fija P y reparte el resto de kcal entre C y G.
  const { objetivos, aplicada } = aplicarProteinaPorKg(base, proteina)
  return aplicada ? { ...objetivos, origen: base.origen, proteinaPorKg: proteina! } : base
}
